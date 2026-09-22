package com.example.ForgeX;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ForgexApplication {

	public static void main(String[] args) {
		SpringApplication.run(ForgexApplication.class, args);
	}

}
