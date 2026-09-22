package com.example.ForgeX.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.ForgeX.model.Order;
import com.example.ForgeX.model.OrderStatus;

import jakarta.persistence.LockModeType;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.razorpayOrderId = :rzpOrderId")
    Optional<Order> findByRazorpayOrderIdForUpdate(@Param("rzpOrderId") String rzpOrderId);

    List<Order> findByStatusAndCreatedAtBefore(OrderStatus status, LocalDateTime before);

    List<Order> findByEmailOrderByCreatedAtDesc(String email);
}