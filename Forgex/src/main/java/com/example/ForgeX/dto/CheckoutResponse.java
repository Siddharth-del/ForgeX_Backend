package com.example.ForgeX.dto;

import com.example.ForgeX.model.OrderStatus;

import lombok.Data;

@Data
public class CheckoutResponse {
    private Long orderId;
    private OrderStatus status;
    private PriceBreakdown price;

    // Only for RAZORPAY — the frontend needs these to open Checkout
    private String razorpayKeyId;
    private String razorpayOrderId;
    private Long amount;           // paise
    private String currency;
    private String customerEmail;
}