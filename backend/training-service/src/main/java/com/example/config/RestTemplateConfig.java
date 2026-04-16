package com.example.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class RestTemplateConfig {

    /**
     * Configures a RestTemplate bean with sensible timeouts
     * for cross-service communication with the Identity Service.
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(5)) // <-- Added "set"
                .setReadTimeout(Duration.ofSeconds(5))    // <-- Added "set"
                .build();
    }
}