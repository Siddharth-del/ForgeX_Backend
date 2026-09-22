package com.example.ForgeX.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ForgeX.dto.CheckoutRequest;
import com.example.ForgeX.dto.CheckoutResponse;
import com.example.ForgeX.dto.PaymentVerifyRequest;
import com.example.ForgeX.dto.PriceBreakdown;
import com.example.ForgeX.exceptions.APIException;
import com.example.ForgeX.exceptions.ResourceNotFoundException;
import com.example.ForgeX.model.*;
import com.example.ForgeX.repository.*;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;

@Service
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);

    @Autowired private CartRepository cartRepository;
    @Autowired private AddressRepository addressRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CouponRepository couponRepository;
    @Autowired private CouponService couponService;
    @Autowired private RazorpayClient razorpayClient;

    @Value("${razorpay.key.id}")         private String keyId;
    @Value("${razorpay.key.secret}")     private String keySecret;
    @Value("${razorpay.webhook.secret}") private String webhookSecret;
    @Value("${razorpay.currency}")       private String currency;

    @Value("${shop.shipping.free-above-paise}") private long freeShippingAbove;
    @Value("${shop.shipping.charge-paise}")     private long shippingCharge;
    @Value("${shop.payment.expiry-minutes}")    private long expiryMinutes;

    // =====================================================================
    // 1. PREVIEW — price breakdown for the cart page ("Apply coupon" button)
    // =====================================================================

    @Transactional(readOnly = true)
    public PriceBreakdown preview(User user, String couponCode) {
        Cart cart = loadCart(user.getEmail());
        return calculate(cart.getCartItems(), couponCode);
    }

    // =====================================================================
    // 2. CHECKOUT — create order, reserve stock, create Razorpay order
    // =====================================================================

    @Transactional
    public CheckoutResponse checkout(User user, CheckoutRequest req) {
        Cart cart = loadCart(user.getEmail());
        List<CartItem> items = new ArrayList<>(cart.getCartItems());
        if (items.isEmpty()) throw new APIException("Your cart is empty");

        Address address = addressRepository.findById(req.getAddressId())
                .orElseThrow(() -> new ResourceNotFoundException("Address", "addressId", req.getAddressId()));
        if (address.getUser() == null || !address.getUser().getUserId().equals(user.getUserId())) {
            throw new APIException("Address does not belong to you");
        }

        PriceBreakdown price = calculate(items, req.getCouponCode());
        if (req.getCouponCode() != null && !req.getCouponCode().isBlank() && price.getCouponCode() == null) {
            throw new APIException(price.getCouponMessage());   // don't silently drop a coupon they typed
        }

        // Build the order
        Order order = new Order();
        order.setEmail(user.getEmail());
        order.setAddress(address);
        order.setPaymentMethod(req.getPaymentMethod());
        order.setSubtotal(price.getSubtotal());
        order.setDiscount(price.getCouponDiscount());
        order.setShipping(price.getShipping());
        order.setTotal(price.getTotal());
        order.setCouponCode(price.getCouponCode());

        for (CartItem ci : items) {
            Product p = ci.getProduct();

            if (!Boolean.TRUE.equals(p.getActive())) {
                throw new APIException(p.getName() + " is no longer available");
            }
            // Reserve stock atomically — fails if someone else took it
            if (productRepository.decrementStock(p.getProductId(), ci.getQuantity()) == 0) {
                throw new APIException("Only " + p.getStock() + " left of " + p.getName());
            }

            OrderItem oi = new OrderItem();
            oi.setProduct(p);
            oi.setProductName(p.getName());
            oi.setQuantity(ci.getQuantity());
            oi.setUnitPrice(p.getPrice());
            oi.setMrp(p.getMrp());
            oi.setLineTotal(p.getPrice() * ci.getQuantity());
            order.addItem(oi);
        }

        Payment payment = new Payment();
        payment.setMethod(req.getPaymentMethod());
        payment.setAmount(price.getTotal());
        order.setPayment(payment);

        CheckoutResponse res = new CheckoutResponse();
        res.setPrice(price);

        if (req.getPaymentMethod() == PaymentMethod.COD) {
            order.setStatus(OrderStatus.CONFIRMED);
            payment.setStatus(PaymentStatus.PENDING_COD);
            order = orderRepository.save(order);

            redeemCouponAndClearCart(order, cart);

        } else {
            order.setStatus(OrderStatus.PENDING_PAYMENT);
            payment.setStatus(PaymentStatus.CREATED);
            order = orderRepository.save(order);       // need the id for the receipt

            String rzpOrderId = createRazorpayOrder(order);
            order.setRazorpayOrderId(rzpOrderId);
            payment.setRazorpayOrderId(rzpOrderId);

            res.setRazorpayKeyId(keyId);
            res.setRazorpayOrderId(rzpOrderId);
            res.setAmount(order.getTotal());
            res.setCurrency(currency);
            res.setCustomerEmail(user.getEmail());
            // Cart is cleared only after payment succeeds
        }

        res.setOrderId(order.getOrderId());
        res.setStatus(order.getStatus());
        return res;
    }

    // =====================================================================
    // 3. VERIFY — called by frontend after Razorpay Checkout succeeds
    // =====================================================================

    @Transactional
    public CheckoutResponse verify(User user, PaymentVerifyRequest req) {
        if (!isValidPaymentSignature(req)) {
            throw new APIException("Payment verification failed");
        }

        Order order = orderRepository.findByRazorpayOrderIdForUpdate(req.getRazorpayOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "razorpayOrderId", req.getRazorpayOrderId()));

        if (!order.getEmail().equals(user.getEmail())) {
            throw new APIException("This order does not belong to you");
        }

        markPaid(order, req.getRazorpayPaymentId(), req.getRazorpaySignature());

        CheckoutResponse res = new CheckoutResponse();
        res.setOrderId(order.getOrderId());
        res.setStatus(order.getStatus());
        return res;
    }

    // =====================================================================
    // 4. WEBHOOK — Razorpay calls this directly (source of truth)
    // =====================================================================

    @Transactional
    public void handleWebhook(String payload, String signature) {
        try {
            if (signature == null || !Utils.verifyWebhookSignature(payload, signature, webhookSecret)) {
                throw new APIException("Invalid webhook signature");
            }
        } catch (RazorpayException e) {
            throw new APIException("Invalid webhook signature");
        }

        JSONObject event = new JSONObject(payload);
        String type = event.getString("event");

        if (!type.equals("payment.captured") && !type.equals("payment.failed")) {
            return;   // ignore other events
        }

        JSONObject pay = event.getJSONObject("payload").getJSONObject("payment").getJSONObject("entity");
        String rzpOrderId = pay.optString("order_id", null);
        String rzpPaymentId = pay.getString("id");
        if (rzpOrderId == null) return;

        Order order = orderRepository.findByRazorpayOrderIdForUpdate(rzpOrderId).orElse(null);
        if (order == null) {
            log.warn("Webhook for unknown Razorpay order {}", rzpOrderId);
            return;
        }

        if (type.equals("payment.captured")) {
            markPaid(order, rzpPaymentId, null);
        } else {
            markFailed(order, pay.optString("error_description", "Payment failed"));
        }
    }

    // =====================================================================
    // 5. EXPIRY — cancel unpaid orders and return their stock
    // =====================================================================

    @Scheduled(fixedDelay = 5 * 60 * 1000)   // every 5 minutes
    @Transactional
    public void expireUnpaidOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(expiryMinutes);
        List<Order> stale = orderRepository.findByStatusAndCreatedAtBefore(OrderStatus.PENDING_PAYMENT, cutoff);

        for (Order order : stale) {
            releaseStock(order);
            order.setStatus(OrderStatus.CANCELLED);
            order.getPayment().setStatus(PaymentStatus.FAILED);
            order.getPayment().setFailureReason("Payment window expired");
            log.info("Expired unpaid order {}", order.getOrderId());
        }
    }

    // =====================================================================
    // Internal helpers
    // =====================================================================

    /** Idempotent: safe to call from both verify and webhook. */
    private void markPaid(Order order, String rzpPaymentId, String signature) {
        Payment payment = order.getPayment();

        if (order.getStatus() == OrderStatus.PAID) {
            return;                                           // already done
        }

        if (order.getStatus() == OrderStatus.CANCELLED) {
            // Customer paid after the order expired — stock was already released
            log.warn("Payment {} received for cancelled order {} — refunding", rzpPaymentId, order.getOrderId());
            payment.setRazorpayPaymentId(rzpPaymentId);
            refund(order, "Order expired before payment completed");
            return;
        }

        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            return;
        }

        order.setStatus(OrderStatus.PAID);
        order.setPaidAt(LocalDateTime.now());
        payment.setStatus(PaymentStatus.CAPTURED);
        payment.setRazorpayPaymentId(rzpPaymentId);
        if (signature != null) payment.setRazorpaySignature(signature);

        Cart cart = cartRepository.findCartByEmail(order.getEmail());
        redeemCouponAndClearCart(order, cart);
    }

    private void markFailed(Order order, String reason) {
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) return;
        // Keep the order PENDING — the customer can retry in the same Checkout window.
        // The expiry job cancels it and releases stock if they never succeed.
        order.getPayment().setFailureReason(reason);
    }

    private void refund(Order order, String reason) {
        Payment payment = order.getPayment();
        try {
            JSONObject req = new JSONObject();
            req.put("amount", payment.getAmount());
            req.put("notes", new JSONObject().put("reason", reason));
            com.razorpay.Refund refund = razorpayClient.payments.refund(payment.getRazorpayPaymentId(), req);
            payment.setRazorpayRefundId(refund.get("id"));
            payment.setStatus(PaymentStatus.REFUNDED);
            order.setStatus(OrderStatus.REFUNDED);
        } catch (RazorpayException e) {
            log.error("Refund failed for order {}: {}", order.getOrderId(), e.getMessage());
            payment.setFailureReason("Refund failed — process manually: " + e.getMessage());
        }
    }

    private void redeemCouponAndClearCart(Order order, Cart cart) {
        if (order.getCouponCode() != null) {
            couponRepository.incrementUsage(order.getCouponCode());
        }
        if (cart != null) {
            cart.getCartItems().clear();          // needs orphanRemoval = true on Cart.cartItems
            cart.setTotalPrice(0.0);
        }
    }

    private void releaseStock(Order order) {
        for (OrderItem oi : order.getOrderItems()) {
            productRepository.incrementStock(oi.getProduct().getProductId(), oi.getQuantity());
        }
    }

    private String createRazorpayOrder(Order order) {
        try {
            JSONObject req = new JSONObject();
            req.put("amount", order.getTotal());                // paise
            req.put("currency", currency);
            req.put("receipt", "FX-" + order.getOrderId());
            req.put("notes", new JSONObject().put("orderId", order.getOrderId()));

            com.razorpay.Order rzpOrder = razorpayClient.orders.create(req);
            return rzpOrder.get("id");
        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed: {}", e.getMessage());
            throw new APIException("Could not start payment. Please try again.");
        }
    }

    private boolean isValidPaymentSignature(PaymentVerifyRequest req) {
        try {
            JSONObject attrs = new JSONObject();
            attrs.put("razorpay_order_id", req.getRazorpayOrderId());
            attrs.put("razorpay_payment_id", req.getRazorpayPaymentId());
            attrs.put("razorpay_signature", req.getRazorpaySignature());
            return Utils.verifyPaymentSignature(attrs, keySecret);
        } catch (RazorpayException e) {
            return false;
        }
    }

    private Cart loadCart(String email) {
        Cart cart = cartRepository.findCartByEmail(email);
        if (cart == null) throw new ResourceNotFoundException("Cart", "email", email);
        return cart;
    }

    /** Single place where money is calculated — used by preview and checkout. */
    private PriceBreakdown calculate(List<CartItem> items, String couponCode) {
        long subtotal = 0, mrpTotal = 0;
        for (CartItem ci : items) {
            Product p = ci.getProduct();
            subtotal += p.getPrice() * ci.getQuantity();
            mrpTotal += (p.getMrp() != null ? p.getMrp() : p.getPrice()) * ci.getQuantity();
        }

        CouponService.CouponResult coupon = couponService.evaluate(couponCode, subtotal);
        long afterDiscount = subtotal - coupon.discount();
        long shipping = (afterDiscount >= freeShippingAbove || items.isEmpty()) ? 0 : shippingCharge;

        return new PriceBreakdown(
                subtotal,
                mrpTotal,
                mrpTotal - subtotal,
                coupon.discount(),
                coupon.code(),
                coupon.message(),
                shipping,
                afterDiscount + shipping);
    }
}