package com.example.ForgeX.dto;

import com.example.ForgeX.model.PaymentMethod;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CheckoutRequest {
    @NotNull
    private Long addressId;

    @NotNull
    private PaymentMethod paymentMethod;   // RAZORPAY or COD

    private String couponCode;             // optional
}