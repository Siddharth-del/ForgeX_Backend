package com.example.ForgeX.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.ForgeX.service.CheckoutService;

@RestController
@RequestMapping("/api/public/webhooks")
public class RazorpayWebhookController {

    @Autowired private CheckoutService checkoutService;

    @PostMapping("/razorpay")
    public ResponseEntity<Void> razorpay(@RequestBody String payload,
                                         @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
        checkoutService.handleWebhook(payload, signature);
        return ResponseEntity.ok().build();
    }
}