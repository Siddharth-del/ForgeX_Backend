package com.example.ForgeX.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.example.ForgeX.model.OrderStatus;
import com.example.ForgeX.model.PaymentMethod;
import com.example.ForgeX.model.PaymentStatus;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderDTO {

    private Long orderId;
    private String email;

    private OrderStatus status;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;

    private Long subtotal;      
    private Long discount;      
    private Long shipping;     
    private Long total;         
    private String couponCode;

    private Long addressId;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;

    private List<OrderItemDTO> orderItems = new ArrayList<>();
}