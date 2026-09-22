package com.example.ForgeX.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.ForgeX.dto.CartDTO;

@Service 
public class CartServiceImpl implements CartService {

    @Override
    public CartDTO addProductToCart(Long productId, Integer quantity) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'addProductToCart'");
    }

    @Override
    public List<CartDTO> getAllCarts() {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'getAllCarts'");
    }

    @Override
    public CartDTO getCart(String emailId, Long cartId) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'getCart'");
    }

    @Override
    public CartDTO updateProductQuantityInCart(Long productId, Integer quantity) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'updateProductQuantityInCart'");
    }

    @Override
    public String deleteProductFromCart(Long cartId, Long productId) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'deleteProductFromCart'");
    }

    @Override
    public void updateProductInCarts(Long cartId, Long productId) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'updateProductInCarts'");
    }
    
}
