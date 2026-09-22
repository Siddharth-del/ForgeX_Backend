package com.example.ForgeX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.example.ForgeX.model.CartItem;



@Repository
public interface CartItemRepository extends JpaRepository<CartItem,Long> {

    @Query("SELECT ci FROM CartItem ci WHERE ci.cart.id=?1 AND ci.product.id=?2")
    CartItem findCartItemByProductIdAndCartId(Long cartId, Long productId);
     
    @Modifying
     @Query("DELETE  FROM CartItem ci WHERE ci.cart.id=?1 AND ci.product.id=?2")
     void deleteCartIteamByProductIdAndCartId(Long cartId, Long productId);

}
