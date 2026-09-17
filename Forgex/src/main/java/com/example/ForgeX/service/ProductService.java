package com.example.ForgeX.service;

import java.io.IOException;

import org.springframework.web.multipart.MultipartFile;

import com.example.ForgeX.dto.ProductDTO;
import com.example.ForgeX.dto.ProductResponse;

public interface ProductService {
    ProductDTO addProduct(ProductDTO product);

    ProductResponse getAllProducts(Integer pageNumber, Integer pageSize, String sortBy, String sortOrder);

    ProductResponse getProductByKeyWord(String keyword, Integer pageNumber, Integer pageSize, String sortBy,
            String sortOrder);

    ProductResponse sortProductByCategory(String category, Integer pageNumber, Integer pageSize, String sortBy,
            String sortOrder);

    public ProductResponse sortProductByGender(String gender, Integer pageNumber, Integer pageSize,
            String sortBy, String sortOrder);

    public String deleteProduct(Long productId);
    public ProductDTO updateProduct(Long id,ProductDTO productDTO);

    public ProductDTO updateProductImage(Long productId, MultipartFile image) throws IOException;
}
