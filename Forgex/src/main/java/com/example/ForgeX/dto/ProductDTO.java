package com.example.ForgeX.dto;

import com.example.ForgeX.model.FragranceFamily;
import com.example.ForgeX.model.Gender;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data 
@AllArgsConstructor 
@NoArgsConstructor 
public class ProductDTO {
    
    private Long productId;
    private String name;
    private String slug;
    private String description;
   
    private String category;


    private String gender;

    private FragranceFamily fragranceFamily;

    private Long mrp;     // original price
    private Long price;   // selling price
    private Integer discount;

    private Integer stock;
    private String image;
    private Boolean active = true;
}
