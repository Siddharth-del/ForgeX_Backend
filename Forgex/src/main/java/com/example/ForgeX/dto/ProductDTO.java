package com.example.ForgeX.dto;

import com.example.ForgeX.model.Category;
import com.example.ForgeX.model.FragranceFamily;
import com.example.ForgeX.model.Gender;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO {

    private Long productId;
    private String name;
    private String slug;
    private String description;

    private Category category;
    private Gender gender;
    private FragranceFamily fragranceFamily;

    private Integer quantity;   // only filled in cart responses; null everywhere else

    private Long mrp;          // original price, in paise
    private Long price;        // selling price, in paise
    private Integer discount;  // calculated, never sent by client

    private Integer stock;
    private String image;
    private Boolean active = true;
}