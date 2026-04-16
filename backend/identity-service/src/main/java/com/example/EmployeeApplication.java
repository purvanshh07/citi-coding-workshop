package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
public class EmployeeApplication {

    public static void main(String[] args) {
        SpringApplication.run(EmployeeApplication.class, args);
        System.out.println("🚀 Employee Service is running on port 8081!");
    }

    // THE FIX: The Bean is now safely INSIDE the class!
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**") // Applies to all endpoints, including /login
                        .allowedOrigins("*") // Allows any port (like React's 3000)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Specifically allows POST and OPTIONS
                        .allowedHeaders("*");
            }
        };
    }
}