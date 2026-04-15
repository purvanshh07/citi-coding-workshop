// src/main/java/com/example/repository/ReviewRepository.java
package com.example.repository;

import com.example.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    // Spring Data JPA auto-implements this from the method name
    List<Review> findByEmployeeId(Long employeeId);
}