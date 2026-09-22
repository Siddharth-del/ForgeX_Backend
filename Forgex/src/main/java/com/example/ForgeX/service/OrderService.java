package com.example.ForgeX.service;

import java.util.List;

import com.example.ForgeX.dto.OrderDTO;
import com.example.ForgeX.model.OrderStatus;

public interface OrderService {

    List<OrderDTO> getMyOrders(String email);

    OrderDTO getMyOrder(String email, Long orderId);

    List<OrderDTO> getAllOrders();                               // admin

    OrderDTO updateStatus(Long orderId, OrderStatus newStatus);  // admin
}