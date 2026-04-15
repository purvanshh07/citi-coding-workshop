// src/main/java/com/example/controller/ReviewController.java
package com.example.controller;

import com.example.dto.ReviewRequestDTO;
import com.example.dto.ReviewResponseDTO;
import com.example.service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reviews")
@CrossOrigin(origins = "http://localhost:3000")
public class ReviewController {

    private final ReviewService reviewService;

    @Autowired
    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /**
     * POST /api/v1/reviews
     * Creates a new performance review. Validates the employee exists first.
     */
    @PostMapping
    public ResponseEntity<?> createReview(@RequestBody ReviewRequestDTO requestDTO) {
        try {
            ReviewResponseDTO createdReview = reviewService.createReview(requestDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdReview);
        } catch (RuntimeException e) {
            // Returns 404/400 with the error message if employee not found
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * GET /api/v1/reviews/employee/{employeeId}
     * Fetches all reviews for a specific employee.
     */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<ReviewResponseDTO>> getReviewsByEmployee(
            @PathVariable Long employeeId) {
        List<ReviewResponseDTO> reviews = reviewService.getReviewsByEmployeeId(employeeId);
        return ResponseEntity.ok(reviews);
    }
}