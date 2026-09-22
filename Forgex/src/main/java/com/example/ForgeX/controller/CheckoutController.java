package com.example.ForgeX.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.ForgeX.dto.CheckoutRequest;
import com.example.ForgeX.dto.CheckoutResponse;
import com.example.ForgeX.dto.PaymentVerifyRequest;
import com.example.ForgeX.dto.PriceBreakdown;
import com.example.ForgeX.service.CheckoutService;
import com.example.ForgeX.util.AuthUtil;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class CheckoutController {

    @Autowired private CheckoutService checkoutService;
    @Autowired private AuthUtil authUtil;

    /** Cart page: show totals, optionally with a coupon. */
    @GetMapping("/checkout/preview")
    public ResponseEntity<PriceBreakdown> preview(@RequestParam(required = false) String coupon) {
        return ResponseEntity.ok(checkoutService.preview(authUtil.loggedInUser(), coupon));
    }

    /** Create order. For RAZORPAY returns the data needed to open Checkout. */
    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> checkout(@Valid @RequestBody CheckoutRequest request) {
        return new ResponseEntity<>(
                checkoutService.checkout(authUtil.loggedInUser(), request),
                HttpStatus.CREATED);
    }

    /** After Razorpay Checkout succeeds in the browser. */
    @PostMapping("/payments/verify")
    public ResponseEntity<CheckoutResponse> verify(@Valid @RequestBody PaymentVerifyRequest request) {
        return ResponseEntity.ok(checkoutService.verify(authUtil.loggedInUser(), request));
    }
}