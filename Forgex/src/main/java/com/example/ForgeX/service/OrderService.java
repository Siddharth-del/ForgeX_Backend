package com.example.ForgeX.service;




import com.example.ForgeX.dto.OrderDTO;

import jakarta.transaction.Transactional;

public interface OrderService {

 OrderDTO placeOrder(String emailId, Long addressId, String paymentMethod, String pgName, String pgPaymentId,
            String pgStatus, String pgResponseMessage); 
    
}
