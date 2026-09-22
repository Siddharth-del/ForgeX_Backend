package com.example.ForgeX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.ForgeX.model.Order;


@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

}
