package com.example.ForgeX.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PriceBreakdown {
    private Long subtotal;         // paise
    private Long mrpTotal;         // paise, for "You save ₹X"
    private Long productSavings;   // mrpTotal − subtotal
    private Long couponDiscount;
    private String couponCode;     // null if none / invalid
    private String couponMessage;  // why a coupon was rejected, or "Applied"
    private Long shipping;
    private Long total;
}