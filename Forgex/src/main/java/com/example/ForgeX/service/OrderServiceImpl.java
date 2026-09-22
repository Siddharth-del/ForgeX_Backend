package com.example.ForgeX.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ForgeX.dto.OrderDTO;
import com.example.ForgeX.dto.OrderItemDTO;
import com.example.ForgeX.exceptions.APIException;
import com.example.ForgeX.exceptions.ResourceNotFoundException;
import com.example.ForgeX.model.*;
import com.example.ForgeX.repository.*;

@Service
public class OrderServiceImpl implements OrderService {

    @Autowired private CartRepository cartRepository;
    @Autowired private AddressRepository addressRepository;
    @Autowired private OrderItemRepository orderItemRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private ModelMapper modelMapper;

    @Override
    @Transactional
    public OrderDTO placeOrder(String emailId, Long addressId, String paymentMethod,
                               String pgName, String pgPaymentId,
                               String pgStatus, String pgResponseMessage) {

        // 1. Load and validate cart
        Cart cart = cartRepository.findCartByEmail(emailId);
        if (cart == null) {
            throw new ResourceNotFoundException("Cart", "email", emailId);
        }
        List<CartItem> cartItems = new ArrayList<>(cart.getCartItems());   // copy
        if (cartItems.isEmpty()) {
            throw new APIException("Cart is empty");
        }

        // 2. Load address and check it belongs to this user
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "addressId", addressId));
        if (address.getUser() == null || !emailId.equals(address.getUser().getEmail())) {
            throw new APIException("Address does not belong to this user");
        }

        // 3. Check payment status (temporary — replace with Razorpay signature check)
        if (!"COD".equalsIgnoreCase(paymentMethod) && !"SUCCESS".equalsIgnoreCase(pgStatus)) {
            throw new APIException("Payment not successful");
        }

        // 4. Check stock for every item before changing anything
        for (CartItem item : cartItems) {
            Product product = item.getProduct();
            if (!Boolean.TRUE.equals(product.getActive())) {
                throw new APIException(product.getName() + " is no longer available");
            }
            if (product.getStock() == null || product.getStock() < item.getQuantity()) {
                throw new APIException("Only " + product.getStock() + " left of " + product.getName());
            }
        }

        // 5. Create order
        Order order = new Order();
        order.setEmail(emailId);
        order.setOrderDate(LocalDate.now());
        order.setOrderStatus("ORDER_ACCEPTED");
        order.setAddress(address);

        Payment payment = new Payment(paymentMethod, pgPaymentId, pgStatus, pgResponseMessage, pgName);
        payment.setOrder(order);
        payment = paymentRepository.save(payment);
        order.setPayment(payment);

        Order savedOrder = orderRepository.save(order);

        // 6. Create order items from CURRENT product price, reduce stock
        List<OrderItem> orderItems = new ArrayList<>();
        double total = 0;

        for (CartItem item : cartItems) {
            Product product = item.getProduct();
            int quantity = item.getQuantity();

            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(product);
            orderItem.setQuantity(quantity);
            orderItem.setOrderProductPrice(product.getPrice());
            orderItem.setDiscount(product.getDiscount());
            orderItem.setOrder(savedOrder);
            orderItems.add(orderItem);

            total += product.getPrice() * quantity;

            product.setStock(product.getStock() - quantity);
            productRepository.save(product);
        }

        orderItems = orderItemRepository.saveAll(orderItems);

        savedOrder.setTotalAmount(total);
        orderRepository.save(savedOrder);

        // 7. Empty the cart (after the loop, not during it)
        cart.getCartItems().clear();
        cart.setTotalPrice(0.0);
        cartRepository.save(cart);

        // 8. Build response
        OrderDTO orderDTO = modelMapper.map(savedOrder, OrderDTO.class);
        List<OrderItemDTO> itemDTOs = orderItems.stream()
                .map(i -> modelMapper.map(i, OrderItemDTO.class))
                .toList();
        orderDTO.setOrderItems(new ArrayList<>(itemDTOs));
        orderDTO.setAddressId(addressId);

        return orderDTO;
    }
}