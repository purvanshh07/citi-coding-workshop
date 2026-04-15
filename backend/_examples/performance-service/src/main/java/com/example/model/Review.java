// src/main/java/com/example/model/Review.java
package com.example.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long employeeId;

    @Column(nullable = false)
    private String reviewerName;

    @Column(nullable = false)
    private int score; // 1-5

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(nullable = false)
    private LocalDate reviewDate;

    // --- Constructors ---
    public Review() {}

    public Review(Long employeeId, String reviewerName, int score, String feedback, LocalDate reviewDate) {
        this.employeeId = employeeId;
        this.reviewerName = reviewerName;
        this.score = score;
        this.feedback = feedback;
        this.reviewDate = reviewDate;
    }
    @PrePersist
    protected void onCreate() {
        if (this.reviewDate == null) {
            this.reviewDate = java.time.LocalDate.now();
        }
    }

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }

    public String getReviewerName() { return reviewerName; }
    public void setReviewerName(String reviewerName) { this.reviewerName = reviewerName; }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }

    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }

    public LocalDate getReviewDate() { return reviewDate; }
    public void setReviewDate(LocalDate reviewDate) { this.reviewDate = reviewDate; }
}