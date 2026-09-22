package com.example.ForgeX.service;

import java.util.List;

import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ForgeX.dto.CartDTO;
import com.example.ForgeX.dto.ProductDTO;
import com.example.ForgeX.exceptions.APIException;
import com.example.ForgeX.exceptions.ResourceNotFoundException;
import com.example.ForgeX.model.Cart;
import com.example.ForgeX.model.CartItem;
import com.example.ForgeX.model.Product;
import com.example.ForgeX.model.User;
import com.example.ForgeX.repository.CartRepository;
import com.example.ForgeX.repository.ProductRepository;
import com.example.ForgeX.util.AuthUtil;

@Service
@Transactional
public class CartServiceImpl implements CartService {

    private static final int MAX_PER_PRODUCT = 10;

    @Autowired private CartRepository cartRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private AuthUtil authUtil;
    @Autowired private ModelMapper modelMapper;

    // ---------- Add ----------

    @Override
    public CartDTO addProductToCart(Long productId, Integer quantity) {
        if (quantity == null || quantity < 1) {
            throw new APIException("Quantity must be at least 1");
        }

        Cart cart = getOrCreateCart(authUtil.loggedInUser());
        Product product = findSellableProduct(productId);

        CartItem item = findItem(cart, productId);
        int newQty = (item == null ? 0 : item.getQuantity()) + quantity;
        checkQuantity(product, newQty);

        if (item == null) {
            item = new CartItem();
            item.setCart(cart);
            item.setProduct(product);
            cart.getCartItems().add(item);
        }
        item.setQuantity(newQty);
        syncPrice(item);

        return save(cart);
    }

    // ---------- Read ----------

    /** cartId is ignored: the cart always comes from the logged-in user's email. */
    @Override
    public CartDTO getCart(String emailId, Long cartId) {
        Cart cart = cartRepository.findCartByEmail(emailId);
        if (cart == null) {
            cart = getOrCreateCart(authUtil.loggedInUser());
        }
        return toDTO(cart);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CartDTO> getAllCarts() {
        return cartRepository.findAll().stream().map(this::toDTO).toList();
    }

    // ---------- Update quantity (+1 / -1) ----------

    @Override
    public CartDTO updateProductQuantityInCart(Long productId, Integer delta) {
        Cart cart = getOrCreateCart(authUtil.loggedInUser());
        CartItem item = findItem(cart, productId);
        if (item == null) {
            throw new ResourceNotFoundException("Product in cart", "productId", productId);
        }

        int newQty = item.getQuantity() + delta;
        if (newQty <= 0) {
            cart.getCartItems().remove(item);          // orphanRemoval deletes the row
        } else {
            checkQuantity(item.getProduct(), newQty);
            item.setQuantity(newQty);
            syncPrice(item);
        }
        return save(cart);
    }

    // ---------- Remove ----------

    @Override
    public String deleteProductFromCart(Long cartId, Long productId) {
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", "cartId", cartId));

        // The cartId comes from the URL, so make sure it's the caller's own cart
        if (!cart.getUser().getUserId().equals(authUtil.loggedInUserId())) {
            throw new ResourceNotFoundException("Cart", "cartId", cartId);
        }

        CartItem item = findItem(cart, productId);
        if (item == null) {
            throw new ResourceNotFoundException("Product in cart", "productId", productId);
        }

        String name = item.getProduct().getName();
        cart.getCartItems().remove(item);
        save(cart);
        return name + " removed from cart";
    }

    // ---------- Called when an admin changes a product's price ----------

    @Override
    public void updateProductInCarts(Long cartId, Long productId) {
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart", "cartId", cartId));
        CartItem item = findItem(cart, productId);
        if (item != null) {
            syncPrice(item);
            save(cart);
        }
    }

    // ---------- Helpers ----------

    private Cart getOrCreateCart(User user) {
        Cart cart = cartRepository.findCartByEmail(user.getEmail());
        if (cart != null) return cart;

        cart = new Cart();
        cart.setUser(user);
        cart.setTotalPrice(0.0);
        return cartRepository.save(cart);
    }

    private Product findSellableProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "productId", productId));
        if (!Boolean.TRUE.equals(product.getActive())) {
            throw new APIException(product.getName() + " is not available");
        }
        return product;
    }

    private void checkQuantity(Product product, int qty) {
        if (qty > MAX_PER_PRODUCT) {
            throw new APIException("You can add at most " + MAX_PER_PRODUCT + " of " + product.getName());
        }
        int stock = product.getStock() == null ? 0 : product.getStock();
        if (qty > stock) {
            throw new APIException(stock == 0
                    ? product.getName() + " is out of stock"
                    : "Only " + stock + " left of " + product.getName());
        }
    }

    private CartItem findItem(Cart cart, Long productId) {
        return cart.getCartItems().stream()
                .filter(ci -> ci.getProduct().getProductId().equals(productId))
                .findFirst()
                .orElse(null);
    }

    /** Keep the snapshot fields on CartItem in line with the product's current price. */
    private void syncPrice(CartItem item) {
        Product p = item.getProduct();
        item.setProductPrice(p.getPrice());                 // paise
        item.setDiscount(p.getDiscount().doubleValue());    // % off MRP
    }

    private CartDTO save(Cart cart) {
        // Total in paise, from current product prices. Checkout recalculates anyway.
        double total = cart.getCartItems().stream()
                .mapToDouble(ci -> ci.getProduct().getPrice() * ci.getQuantity())
                .sum();
        cart.setTotalPrice(total);
        return toDTO(cartRepository.save(cart));
    }

    private CartDTO toDTO(Cart cart) {
        List<ProductDTO> products = cart.getCartItems().stream().map(ci -> {
            ProductDTO dto = modelMapper.map(ci.getProduct(), ProductDTO.class);
            dto.setQuantity(ci.getQuantity());
            return dto;
        }).toList();

        CartDTO dto = new CartDTO();
        dto.setCartId(cart.getCartId());
        dto.setTotalPrice(cart.getTotalPrice());
        dto.setProducts(products);
        return dto;
    }
}