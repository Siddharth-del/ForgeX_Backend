package com.example.ForgeX.model;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "coupons")
@Getter
@Setter
@NoArgsConstructor
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long couponId;

    @Column(nullable = false, unique = true, length = 30)
    private String code;                    // stored UPPERCASE, e.g. FORGE10

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DiscountType type;

    @Column(nullable = false)
    private Long value;                     // PERCENT: 10 = 10%  |  FLAT: paise, 20000 = ₹200

    private Long minOrderPaise = 0L;        // cart subtotal must be at least this
    private Long maxDiscountPaise;          // cap for PERCENT coupons (null = no cap)

    private Integer usageLimit;             // null = unlimited
    private Integer usedCount = 0;

    private LocalDateTime validFrom;
    private LocalDateTime validTo;

    private Boolean active = true;
}