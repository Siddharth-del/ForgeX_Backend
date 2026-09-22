package com.example.ForgeX.dto;

import java.time.LocalDateTime;

import com.example.ForgeX.model.DiscountType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CouponDTO {
    private Long couponId;
    @NotBlank private String code;
    @NotNull  private DiscountType type;
    @NotNull @Positive private Long value;
    private Long minOrderPaise;
    private Long maxDiscountPaise;
    private Integer usageLimit;
    private Integer usedCount;
    private LocalDateTime validFrom;
    private LocalDateTime validTo;
    private Boolean active = true;
}