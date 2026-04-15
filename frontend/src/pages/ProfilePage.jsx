// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ProfilePage({ employee, currentUser }) {
    const [reviews, setReviews] = useState([]);

    useEffect(() => {
        if (employee) {
            api.getReviewsForEmployee(employee.id)
                .then(data => setReviews(data))
                .catch(err => console.error("Failed to load reviews", err));
        }
    }, [employee]);

    return (
        <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '8px', border: '1px solid #eee' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '2rem' }}>{employee.firstName} {employee.lastName}</h2>
            <p style={{ color: '#666', fontSize: '1.2rem', marginBottom: '30px' }}>
                {employee.jobTitle} | {employee.department}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Performance History</h3>

                {/* Security Feature: Only HR can see this button */}
                {currentUser.role === 'HR' && (
                    <button style={{ background: '#198754', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer' }}>
                        + Write New Review
                    </button>
                )}
            </div>

            {reviews.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#888' }}>No reviews found for this employee.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {reviews.map(review => (
                        <div key={review.id} style={{ borderLeft: '4px solid #0d6efd', background: 'white', padding: '15px', borderRadius: '0 4px 4px 0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong>⭐ Score: {review.score}/5</strong>
                                <span style={{ color: '#888' }}>{review.reviewDate}</span>
                            </div>
                            <p style={{ margin: '10px 0', fontStyle: 'italic' }}>"{review.feedback}"</p>
                            <small style={{ color: '#555' }}>— {review.reviewerName}</small>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}