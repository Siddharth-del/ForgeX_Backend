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

import com.example.ForgeX.dto.AddressDTO;
import com.example.ForgeX.model.User;
import com.example.ForgeX.service.AddressService;
import com.example.ForgeX.util.AuthUtil;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class AddressController {

    @Autowired
    private AuthUtil authUtil;
    
    @Autowired
    private AddressService addressService;
     
    @PostMapping("/addresses")
    public ResponseEntity<AddressDTO >createAddress(@Valid @RequestBody AddressDTO address){
        User user=authUtil.loggedInUser();
        AddressDTO  AddressCreated=addressService.createAddress(address,user);
        return new ResponseEntity<>(AddressCreated,HttpStatus.CREATED);
    }

     @GetMapping("/addresses")
    public ResponseEntity<List<AddressDTO>>getAddresses(){
        List<AddressDTO> address=addressService.getAddresses();
        return new ResponseEntity<>(address,HttpStatus.OK);
    }

     @GetMapping("/addresses/{addressId}")
    public ResponseEntity<AddressDTO>getAddressById(@PathVariable Long addressId){
    AddressDTO address=addressService.getAddressById(addressId);
        return new ResponseEntity<>(address,HttpStatus.OK);
    }
     
    @GetMapping("/users/addresses")
    public ResponseEntity<List<AddressDTO>>getUserAddresses(){
        User user=authUtil.loggedInUser();
        List<AddressDTO>  AddressCreated=addressService.getUserAddresses(user);
        return new ResponseEntity<>(AddressCreated,HttpStatus.OK);
    }
    
     @PutMapping("/addresses/{addressId}")
    public ResponseEntity<AddressDTO>UpdateAddresses(@PathVariable Long addressId,@RequestBody AddressDTO addressDTO){
    AddressDTO address=addressService.UpdateAddresses(addressId,addressDTO);
        return new ResponseEntity<>(address,HttpStatus.OK);
    }

     @DeleteMapping("/addresses/{addressId}")
    public ResponseEntity<String>UpdateAddresses(@PathVariable Long addressId){
    
        return new ResponseEntity<>(addressService.deleteAddress(addressId),HttpStatus.OK);
    }
    

}
