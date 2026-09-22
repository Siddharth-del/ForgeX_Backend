package com.example.ForgeX.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ForgeX.dto.CartDTO;
import com.example.ForgeX.model.Cart;
import com.example.ForgeX.repository.CartRepository;
import com.example.ForgeX.service.CartService;
import com.example.ForgeX.util.AuthUtil;


@RestController
@RequestMapping("/api")
public class CartController {
     
    @Autowired
    private  CartService cartService;

    @Autowired
    AuthUtil authUtil;

    @Autowired
    CartRepository cartRepository;

    @PostMapping("/carts/products/{productId}/quantity/{quantity}")
    public ResponseEntity<CartDTO> addProductToCart(@PathVariable("productId") Long productId,
                                                      @PathVariable("quantity") Integer quantity){
        CartDTO cartDTO=cartService.addProductToCart(productId,quantity);
        return new ResponseEntity<CartDTO>(cartDTO,HttpStatus.CREATED);
    }

    @GetMapping("/carts")
    public ResponseEntity<List<CartDTO>> getCarts(){
        List<CartDTO> carts=cartService.getAllCarts();
        return new ResponseEntity<List<CartDTO>>(carts,HttpStatus.OK);
    }

    @GetMapping("/carts/users/cart")
    public ResponseEntity<CartDTO> getCartById(){
        String emailId=authUtil.loggedInEmail();
        Cart cart=cartRepository.findCartByEmail(emailId);
        Long cartId=cart.getCartId();
        CartDTO cartDTO=cartService.getCart(emailId,cartId);
        return  new ResponseEntity<>(cartDTO,HttpStatus.OK);
    } 

    @PutMapping("/cart/products/{productId}/quantity/{operation}")
    public ResponseEntity<CartDTO> updateCartProduct(@PathVariable("productId") Long productId,
                                                       @PathVariable("operation") String operation){
           CartDTO updateCartDTO=cartService.updateProductQuantityInCart(productId,operation.equalsIgnoreCase("delete")?-1:1);
           return new ResponseEntity<>(updateCartDTO,HttpStatus.OK);
    }

    @DeleteMapping("/carts/{cartId}/product/{productId}")
    public ResponseEntity<String> deleteProductFromCart(@PathVariable("cartId") Long cartId,
                                                          @PathVariable("productId") Long productId){
         String status= cartService.deleteProductFromCart(cartId,productId);
         return new ResponseEntity<String>(status,HttpStatus.OK);
    }
    
}