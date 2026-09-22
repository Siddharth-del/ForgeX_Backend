package com.example.ForgeX.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.ForgeX.dto.CouponDTO;
import com.example.ForgeX.service.CouponService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/coupons")
public class CouponController {

    @Autowired private CouponService couponService;

    @PostMapping
    public ResponseEntity<CouponDTO> create(@Valid @RequestBody CouponDTO dto) {
        return new ResponseEntity<>(couponService.create(dto), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<CouponDTO>> all() {
        return ResponseEntity.ok(couponService.findAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<CouponDTO> update(@PathVariable Long id, @Valid @RequestBody CouponDTO dto) {
        return ResponseEntity.ok(couponService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        couponService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}