package com.example.ForgeX.service;

import java.util.List;

import com.example.ForgeX.dto.AddressDTO;
import com.example.ForgeX.model.User;


public interface AddressService {
    AddressDTO createAddress(AddressDTO address,User user);
    List<AddressDTO> getAddresses();
     AddressDTO getAddressById(Long addressId);
    List<AddressDTO> getUserAddresses(User user);
    AddressDTO UpdateAddresses(Long addressId, AddressDTO addressDTO);
    String  deleteAddress(Long addressId);
    
}
