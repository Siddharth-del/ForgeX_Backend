package com.example.ForgeX.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long productId;

    private String name;
    private String slug;
    private String description;

    @Enumerated(EnumType.STRING)
    private Category category;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    private FragranceFamily fragranceFamily;

    private Long mrp;     // original price
    private Long price;   // selling price

    private Integer stock;
    private String image;
    private Boolean active = true;

    // public int getDiscountPercent() {
    //     if (mrpPaise == null || pricePaise == null || mrpPaise == 0) return 0;
    //     return (int) ((mrpPaise - pricePaise) * 100 / mrpPaise);
    // }
}