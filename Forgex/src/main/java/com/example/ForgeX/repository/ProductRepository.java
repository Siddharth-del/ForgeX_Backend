package com.example.ForgeX.repository;

import java.util.Locale.Category;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.ForgeX.model.Gender;
import com.example.ForgeX.model.Product;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByNameLikeIgnoreCase(String keyword, Pageable pageDetails);

    Page<Product> findByCategory(com.example.ForgeX.model.Category categoryEnum, PageRequest pageDetails);

    Page<Product> findByGender(Gender genderEnum, PageRequest pageDetails);

    // Page<Product> findByCategory(String upperCase, PageRequest pageDetails);
    /**
     * Atomic: only succeeds if enough stock. Returns 1 on success, 0 if not enough.
     */
    @Modifying
    @Query("UPDATE Product p SET p.stock = p.stock - :qty WHERE p.productId = :id AND p.stock >= :qty")
    int decrementStock(@Param("id") Long productId, @Param("qty") int qty);

    @Modifying
    @Query("UPDATE Product p SET p.stock = p.stock + :qty WHERE p.productId = :id")
    int incrementStock(@Param("id") Long productId, @Param("qty") int qty);
}
