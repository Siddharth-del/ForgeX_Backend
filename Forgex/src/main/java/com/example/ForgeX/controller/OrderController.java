package com.example.ForgeX.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.ForgeX.dto.OrderDTO;
import com.example.ForgeX.model.OrderStatus;
import com.example.ForgeX.service.OrderService;
import com.example.ForgeX.util.AuthUtil;

@RestController
@RequestMapping("/api")
public class OrderController {

    @Autowired private OrderService orderService;
    @Autowired private AuthUtil authUtil;

    // Customer
    @GetMapping("/orders")
    public ResponseEntity<List<OrderDTO>> myOrders() {
        return ResponseEntity.ok(orderService.getMyOrders(authUtil.loggedInEmail()));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderDTO> myOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.getMyOrder(authUtil.loggedInEmail(), orderId));
    }

    // Admin
    @GetMapping("/admin/orders")
    public ResponseEntity<List<OrderDTO>> allOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @PatchMapping("/admin/orders/{orderId}/status")
    public ResponseEntity<OrderDTO> updateStatus(@PathVariable Long orderId,
                                                 @RequestParam OrderStatus status) {
        return ResponseEntity.ok(orderService.updateStatus(orderId, status));
    }
}