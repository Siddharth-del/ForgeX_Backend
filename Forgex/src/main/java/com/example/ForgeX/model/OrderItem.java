package com.example.ForgeX.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderItemId;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    // Snapshots — stay correct even if the product changes later
    private String productName;
    private Integer quantity;
    private Long unitPrice;     // paise
    private Long mrp;           // paise
    private Long lineTotal;     // unitPrice × quantity
}