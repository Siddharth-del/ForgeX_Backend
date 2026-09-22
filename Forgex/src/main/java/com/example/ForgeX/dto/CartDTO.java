package com.example.ForgeX.dto;

import java.util.ArrayList;
import java.util.List;

import org.hibernate.internal.build.AllowNonPortable;

import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@AllowNonPortable
@NoArgsConstructor
public class CartDTO {

    private Long cartId;
    private Double totalPrice=0.0;
    private List<ProductDTO> products=new ArrayList<>();
    
}
