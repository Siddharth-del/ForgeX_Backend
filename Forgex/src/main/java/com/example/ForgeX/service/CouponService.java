package com.example.ForgeX.service;

import java.time.LocalDateTime;
import java.util.List;

import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ForgeX.dto.CouponDTO;
import com.example.ForgeX.exceptions.APIException;
import com.example.ForgeX.exceptions.ResourceNotFoundException;
import com.example.ForgeX.model.Coupon;
import com.example.ForgeX.model.DiscountType;
import com.example.ForgeX.repository.CouponRepository;

@Service
public class CouponService {

    @Autowired private CouponRepository couponRepository;
    @Autowired private ModelMapper modelMapper;

   
    public record CouponResult(long discount, String code, String message) {
        static CouponResult none(String message) { return new CouponResult(0, null, message); }
    }

    public CouponResult evaluate(String rawCode, long subtotal) {
        if (rawCode == null || rawCode.isBlank()) {
            return CouponResult.none(null);
        }
        String code = rawCode.trim().toUpperCase();

        Coupon c = couponRepository.findByCodeIgnoreCase(code).orElse(null);
        LocalDateTime now = LocalDateTime.now();

        if (c == null || !Boolean.TRUE.equals(c.getActive()))
            return CouponResult.none("Invalid coupon code");
        if (c.getValidFrom() != null && now.isBefore(c.getValidFrom()))
            return CouponResult.none("This coupon is not active yet");
        if (c.getValidTo() != null && now.isAfter(c.getValidTo()))
            return CouponResult.none("This coupon has expired");
        if (c.getUsageLimit() != null && c.getUsedCount() >= c.getUsageLimit())
            return CouponResult.none("This coupon has reached its usage limit");
        if (c.getMinOrderPaise() != null && subtotal < c.getMinOrderPaise())
            return CouponResult.none("Add ₹" + (c.getMinOrderPaise() - subtotal) / 100 + " more to use this coupon");

        long discount;
        if (c.getType() == DiscountType.PERCENT) {
            discount = subtotal * c.getValue() / 100;
            if (c.getMaxDiscountPaise() != null) {
                discount = Math.min(discount, c.getMaxDiscountPaise());
            }
        } else {
            discount = c.getValue();
        }
        discount = Math.min(discount, subtotal);    // never below zero

        return new CouponResult(discount, c.getCode(), "Applied");
    }

    

    @Transactional
    public CouponDTO create(CouponDTO dto) {
        String code = dto.getCode().trim().toUpperCase();
        if (couponRepository.existsByCodeIgnoreCase(code)) {
            throw new APIException("Coupon code already exists: " + code);
        }
        validateRules(dto);
        Coupon coupon = modelMapper.map(dto, Coupon.class);
        coupon.setCouponId(null);
        coupon.setCode(code);
        coupon.setUsedCount(0);
        return modelMapper.map(couponRepository.save(coupon), CouponDTO.class);
    }

    @Transactional
    public CouponDTO update(Long id, CouponDTO dto) {
        Coupon c = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon", "couponId", id));
        validateRules(dto);
        c.setType(dto.getType());
        c.setValue(dto.getValue());
        c.setMinOrderPaise(dto.getMinOrderPaise());
        c.setMaxDiscountPaise(dto.getMaxDiscountPaise());
        c.setUsageLimit(dto.getUsageLimit());
        c.setValidFrom(dto.getValidFrom());
        c.setValidTo(dto.getValidTo());
        if (dto.getActive() != null) c.setActive(dto.getActive());
        return modelMapper.map(c, CouponDTO.class);
    }

    public List<CouponDTO> findAll() {
        return couponRepository.findAll().stream()
                .map(c -> modelMapper.map(c, CouponDTO.class))
                .toList();
    }

    @Transactional
    public void deactivate(Long id) {
        Coupon c = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon", "couponId", id));
        c.setActive(false);
    }

    private void validateRules(CouponDTO dto) {
        if (dto.getType() == DiscountType.PERCENT && (dto.getValue() < 1 || dto.getValue() > 90)) {
            throw new APIException("Percent coupons must be between 1 and 90");
        }
        if (dto.getValidFrom() != null && dto.getValidTo() != null
                && dto.getValidTo().isBefore(dto.getValidFrom())) {
            throw new APIException("validTo must be after validFrom");
        }
    }
}