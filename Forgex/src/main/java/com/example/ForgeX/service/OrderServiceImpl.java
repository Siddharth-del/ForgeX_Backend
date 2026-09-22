package com.example.ForgeX.service;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ForgeX.dto.OrderDTO;
import com.example.ForgeX.dto.OrderItemDTO;
import com.example.ForgeX.exceptions.APIException;
import com.example.ForgeX.exceptions.ResourceNotFoundException;
import com.example.ForgeX.model.Order;
import com.example.ForgeX.model.OrderItem;
import com.example.ForgeX.model.OrderStatus;
import com.example.ForgeX.repository.OrderRepository;

@Service
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    @Autowired
    private OrderRepository orderRepository;

  
    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = Map.of(
            OrderStatus.PAID,      Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED, Set.of(OrderStatus.SHIPPED, OrderStatus.CANCELLED),
            OrderStatus.SHIPPED,   Set.of(OrderStatus.DELIVERED)
    );

    @Override
    public List<OrderDTO> getMyOrders(String email) {
        return orderRepository.findByEmailOrderByCreatedAtDesc(email).stream()
                .map(this::toDTO)
                .toList();
    }

    @Override
    public OrderDTO getMyOrder(String email, Long orderId) {
        Order order = find(orderId);
        if (!order.getEmail().equals(email)) {
            // Same message as "not found" so users can't probe other people's order ids
            throw new ResourceNotFoundException("Order", "orderId", orderId);
        }
        return toDTO(order);
    }

    @Override
    public List<OrderDTO> getAllOrders() {
        return orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(this::toDTO)
                .toList();
    }

    @Override
    @Transactional
    public OrderDTO updateStatus(Long orderId, OrderStatus newStatus) {
        Order order = find(orderId);
        Set<OrderStatus> allowed = ALLOWED.getOrDefault(order.getStatus(), Set.of());

        if (!allowed.contains(newStatus)) {
            throw new APIException("Cannot move order from " + order.getStatus() + " to " + newStatus);
        }
        order.setStatus(newStatus);
        return toDTO(order);
    }

  

    private Order find(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "orderId", orderId));
    }

    private OrderDTO toDTO(Order order) {
        OrderDTO dto = new OrderDTO();
        dto.setOrderId(order.getOrderId());
        dto.setEmail(order.getEmail());
        dto.setStatus(order.getStatus());
        dto.setPaymentMethod(order.getPaymentMethod());
        dto.setPaymentStatus(order.getPayment() != null ? order.getPayment().getStatus() : null);
        dto.setSubtotal(order.getSubtotal());
        dto.setDiscount(order.getDiscount());
        dto.setShipping(order.getShipping());
        dto.setTotal(order.getTotal());
        dto.setCouponCode(order.getCouponCode());
        dto.setAddressId(order.getAddress() != null ? order.getAddress().getAddressId() : null);
        dto.setCreatedAt(order.getCreatedAt());
        dto.setPaidAt(order.getPaidAt());
        dto.setOrderItems(order.getOrderItems().stream().map(this::toItemDTO).toList());
        return dto;
    }

    private OrderItemDTO toItemDTO(OrderItem item) {
        OrderItemDTO dto = new OrderItemDTO();
        dto.setOrderItemId(item.getOrderItemId());
        dto.setProductId(item.getProduct() != null ? item.getProduct().getProductId() : null);
        dto.setProductName(item.getProductName());
        dto.setQuantity(item.getQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setMrp(item.getMrp());
        dto.setLineTotal(item.getLineTotal());
        return dto;
    }
}