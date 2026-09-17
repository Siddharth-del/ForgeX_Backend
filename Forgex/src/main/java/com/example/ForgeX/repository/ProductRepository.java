package com.example.ForgeX.repository;

import java.util.Locale.Category;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.ForgeX.model.Gender;
import com.example.ForgeX.model.Product;

@Repository 
public interface ProductRepository extends JpaRepository<Product,Long> {

   
    Page<Product> findByNameLikeIgnoreCase(String keyword, Pageable pageDetails);

    Page<Product> findByCategory(com.example.ForgeX.model.Category categoryEnum,PageRequest pageDetails);

    Page<Product> findByGender(Gender genderEnum, PageRequest pageDetails);

//Page<Product> findByCategory(String upperCase, PageRequest pageDetails);
    
}
