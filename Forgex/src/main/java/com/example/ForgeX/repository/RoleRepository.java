package com.example.ForgeX.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.ForgeX.model.AppRole;
import com.example.ForgeX.model.Role;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByRoleName(AppRole appRole);
}
