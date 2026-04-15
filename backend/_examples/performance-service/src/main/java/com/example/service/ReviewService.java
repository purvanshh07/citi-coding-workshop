// src/main/java/com/example/service/ReviewService.java
package com.example.service;

import com.example.dto.ReviewRequestDTO;
import com.example.dto.ReviewResponseDTO;
import com.example.model.Review;
import com.example.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    private static final String EMPLOYEE_SERVICE_URL =
            "http://localhost:8081/api/v1/employees/{employeeId}";

    private final ReviewRepository reviewRepository;
    private final RestTemplate restTemplate;

    @Autowired
    public ReviewService(ReviewRepository reviewRepository, RestTemplate restTemplate) {
        this.reviewRepository = reviewRepository;
        this.restTemplate = restTemplate;
    }

    /**
     * Creates a review only if the employee exists in the Employee Identity Service.
     * Throws RuntimeException if the employee is not found (HTTP 404) or the
     * remote service is unreachable.
     */
    public ReviewResponseDTO createReview(ReviewRequestDTO requestDTO) {
        // --- CRITICAL: Validate employee exists on the remote service ---
        try {
            ResponseEntity<Object> response = restTemplate.getForEntity(
                    EMPLOYEE_SERVICE_URL,
                    Object.class,          // We only care about the status code
                    requestDTO.getEmployeeId()
            );

            // If we reach here, the employee was found (2xx response)
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException(
                        "Employee with ID " + requestDTO.getEmployeeId() + " not found."
                );
            }

        } catch (HttpClientErrorException.NotFound e) {
            // HTTP 404 received from Employee Identity Service
            throw new RuntimeException(
                    "Cannot create review: Employee with ID "
                            + requestDTO.getEmployeeId()
                            + " does not exist in the Employee Identity Service."
            );
        } catch (HttpClientErrorException e) {
            // Other 4xx errors
            throw new RuntimeException(
                    "Client error when validating employee: " + e.getMessage()
            );
        } catch (Exception e) {
            // Network errors, timeouts, service down, etc.
            throw new RuntimeException(
                    "Could not reach Employee Identity Service to validate employee ID "
                            + requestDTO.getEmployeeId() + ". Cause: " + e.getMessage()
            );
        }

        // --- Employee is valid. Proceed to save the review. ---
        Review review = mapToEntity(requestDTO);
        Review savedReview = reviewRepository.save(review);
        return mapToResponseDTO(savedReview);
    }

    /**
     * Returns all reviews for a given employee ID.
     */
    public List<ReviewResponseDTO> getReviewsByEmployeeId(Long employeeId) {
        return reviewRepository.findByEmployeeId(employeeId)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // --- Private mapping helpers ---

    private Review mapToEntity(ReviewRequestDTO dto) {
        Review review = new Review();
        review.setEmployeeId(dto.getEmployeeId());
        review.setReviewerName(dto.getReviewerName());
        review.setScore(dto.getScore());
        review.setFeedback(dto.getFeedback());
        review.setReviewDate(dto.getReviewDate());
        return review;
    }

    private ReviewResponseDTO mapToResponseDTO(Review review) {
        ReviewResponseDTO dto = new ReviewResponseDTO();
        dto.setId(review.getId());
        dto.setEmployeeId(review.getEmployeeId());
        dto.setReviewerName(review.getReviewerName());
        dto.setScore(review.getScore());
        dto.setFeedback(review.getFeedback());
        dto.setReviewDate(review.getReviewDate());
        return dto;
    }
}