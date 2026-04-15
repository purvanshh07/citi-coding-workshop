import { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import './App.css';

export default function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [reviewsMap, setReviewsMap] = useState({}); // New: Stores reviews for every employee

    // Modal State
    const [isAddingReview, setIsAddingReview] = useState(false);
    const [newReviewScore, setNewReviewScore] = useState("5");
    const [newReviewFeedback, setNewReviewFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false); // New loading state

    const carouselRef = useRef(null);
    useEffect(() => {
        api.getAllEmployees().then(async (data) => {
            if (data.length === 0) {
                setEmployees([
                    { id: 2, firstName: 'Sarah', lastName: 'Connor', jobTitle: 'Product Manager', department: 'Product' },
                    { id: 3, firstName: 'John', lastName: 'Wick', jobTitle: 'Security Specialist', department: 'Operations' },
                    { id: 4, firstName: 'Tony', lastName: 'Stark', jobTitle: 'Lead Engineer', department: 'Engineering' }
                ]);
            } else {
                setEmployees(data);

                // NEW: Fetch all reviews in the background
                const rMap = {};
                for (const emp of data) {
                    try {
                        const r = await api.getReviewsForEmployee(emp.id);
                        rMap[emp.id] = r;
                    } catch (e) { rMap[emp.id] = []; }
                }
                setReviewsMap(rMap);
            }
        }).catch(() => {});
    }, []);

    const searchResults = searchQuery.trim() === "" ? [] : employees.filter(emp =>
        `${emp.firstName} ${emp.lastName} ${emp.jobTitle} ${emp.id}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const loadProfile = (employee) => {
        setSelectedEmployee(employee);
        api.getReviewsForEmployee(employee.id).then(setReviews).catch(() => {});
    };

    const handleGoHome = () => {
        setSelectedEmployee(null);
        setSearchQuery("");
    };

    const scrollCarousel = (direction) => {
        if (carouselRef.current) {
            const scrollAmount = 320;
            carouselRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    // --- THE FIXED SUBMIT FUNCTION ---
    const submitReview = async () => {
        // 1. Validation! Prevent bad data from being sent
        if (!newReviewFeedback.trim()) {
            alert("Feedback cannot be empty. Please write a review.");
            return;
        }
        const scoreInt = parseInt(newReviewScore);
        if (isNaN(scoreInt) || scoreInt < 1 || scoreInt > 5) {
            alert("Score must be a valid number between 1 and 5.");
            return;
        }

        setIsSubmitting(true); // Lock the button so they don't spam click

        try {
            const payload = {
                employeeId: selectedEmployee.id,
                reviewerName: currentUser.name,
                score: scoreInt,
                feedback: newReviewFeedback
            };

            const response = await fetch('http://localhost:8082/api/v1/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 2. Error Handling! Check if the backend actually accepted it
            if (!response.ok) {
                throw new Error("Backend rejected the data.");
            }

            // 3. Success! Reset the form and fetch the new data
            setIsAddingReview(false);
            setNewReviewFeedback("");
            setNewReviewScore("5");
            loadProfile(selectedEmployee); // This pulls the fresh data from the DB

        } catch (error) {
            console.error("Submission Error:", error);
            alert("Failed to save the review. Make sure Port 8082 is running without errors!");
        } finally {
            setIsSubmitting(false); // Unlock the button
        }
    };

    // --- LOGIN SCREEN ---
    if (!currentUser) {
        return (
            <div className="overlay">
                <div className="login-screen app-container">
                    <h1 className="brand" style={{ fontSize: '5rem', marginBottom: '10px' }}>ACME.</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.4rem', marginBottom: '50px' }}>
                        A culture of growth. Together.
                    </p>
                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        <button className="btn-primary" onClick={() => setCurrentUser({ role: 'HR', name: 'HR Admin' })}>
                            Sign In as HR
                        </button>
                        <button className="btn-secondary" onClick={() => {
                            const abhas = employees.find(e => e.id === 1) || { id: 1, firstName: 'Abhas', lastName: 'Shukla', jobTitle: 'Mechanical Engineer', department: 'Engineering' };
                            setCurrentUser({ role: 'EMPLOYEE', name: 'Abhas Shukla' });
                            loadProfile(abhas);
                        }}>
                            Sign In as Employee
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="overlay">
            <div className="app-container">

                {/* Navigation */}
                <nav className="top-nav">
                    <div className="brand" onClick={handleGoHome} title="Return to Directory">
                        ACME.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>{currentUser.name}</span>
                        <button className="btn-secondary" onClick={() => { setCurrentUser(null); handleGoHome(); }}>
                            Sign Out
                        </button>
                    </div>
                </nav>

                {/* --- VIEW 1: HR DASHBOARD --- */}
                {!selectedEmployee && currentUser.role === 'HR' && (
                    <div className="dashboard-split">

                        <div className="left-panel">
                            <h2 style={{ fontSize: '2.5rem', margin: '0 0 20px 0' }}>Your Team.</h2>
                            <input
                                type="text"
                                className="search-bar"
                                placeholder="🔍 Search directory..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />

                            <div className="search-results-container">
                                {searchQuery.trim() === "" ? (
                                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                                        Type a name or role to quickly find someone.
                                    </p>
                                ) : searchResults.length === 0 ? (
                                    <p style={{ color: '#ff6b6b', textAlign: 'center' }}>No matches found.</p>
                                ) : (
                                    searchResults.map(emp => (
                                        <div key={emp.id} className="search-result-item" onClick={() => loadProfile(emp)}>
                                            <img src={`https://i.pravatar.cc/150?u=${emp.firstName}`} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%'}} />
                                            <div>
                                                <h4 style={{ margin: '0 0 2px 0' }}>{emp.firstName} {emp.lastName}</h4>
                                                <small style={{ color: 'var(--purple-accent)' }}>{emp.jobTitle}</small>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="right-panel">
                            <button className="carousel-btn left" onClick={() => scrollCarousel('left')}>‹</button>

                            <div className="carousel-container" ref={carouselRef}>
                                {/* Fixed Duplicate Bug: Using exactly 'employees.map' without duplicating the array */}
                                {employees.map(emp => (
                                    <div key={emp.id} className="scroll-card">
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                                                <img src={`https://i.pravatar.cc/150?u=${emp.firstName}`} alt="avatar" style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px solid var(--purple-accent)'}} />
                                                <div>
                                                    <h3 style={{ margin: '0 0 2px 0', fontSize: '1.4rem' }}>{emp.firstName}</h3>
                                                    <h3 style={{ margin: '0 0 2px 0', fontSize: '1.4rem' }}>{emp.lastName}</h3>
                                                </div>
                                            </div>
                                            <p style={{ color: 'var(--purple-accent)', margin: '0 0 10px 0', fontWeight: 'bold' }}>{emp.jobTitle}</p>
                                            <p style={{ color: 'var(--text-muted)', margin: '0', fontSize: '0.9rem' }}>ID: #{emp.id}</p>
                                        </div>
                                        <div className="card-review-preview">
                                            {reviewsMap[emp.id]?.length > 0 ? (
                                                <>
                                                    <span style={{ color: '#fbbf24' }}>⭐ {reviewsMap[emp.id][0].score}/5</span>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '5px 0' }}>
                                                        "{reviewsMap[emp.id][0].feedback.substring(0, 30)}..."
                                                    </p>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No reviews yet</span>
                                            )}
                                        </div>


                                        <button className="btn-secondary" style={{ width: '100%', marginTop: '20px' }} onClick={() => loadProfile(emp)}>
                                            View Profile
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button className="carousel-btn right" onClick={() => scrollCarousel('right')}>›</button>
                        </div>
                    </div>
                )}

                {/* --- VIEW 2: EMPLOYEE PROFILE --- */}
                {selectedEmployee && (
                    <div className="scroll-card" style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>

                        {currentUser.role === 'HR' && (
                            <div style={{ marginBottom: '30px' }}>
                                <button className="btn-secondary" onClick={handleGoHome}>
                                    ← Back to Directory
                                </button>
                            </div>
                        )}

                        <div style={{ textAlign: 'center' }}>
                            <img src={`https://i.pravatar.cc/150?u=${selectedEmployee.firstName}`} alt="Profile Avatar" className="avatar" />
                            <h2 style={{ fontSize: '2.5rem', margin: '10px 0 0 0' }}>{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
                            <p style={{ color: 'var(--purple-accent)', fontSize: '1.2rem', fontWeight: 'bold', margin: '5px 0' }}>
                                {selectedEmployee.jobTitle}
                            </p>
                            <p style={{ color: 'var(--text-muted)', margin: '0 0 30px 0' }}>
                                {selectedEmployee.department} Division | Active Status 🟢
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0 }}>Performance History</h3>
                            {currentUser.role === 'HR' && (
                                <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => setIsAddingReview(true)}>
                                    + Add Review
                                </button>
                            )}
                        </div>

                        <div style={{ marginTop: '20px', textAlign: 'left' }}>
                            {reviews.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No review data found on Port 8082.</p>
                            ) : (
                                reviews.map(r => (
                                    <div key={r.id} className="review-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>⭐ {r.score}/5</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{r.reviewDate}</span>
                                        </div>
                                        <p style={{ fontSize: '1.1rem', lineHeight: '1.5', margin: '0 0 10px 0', color: 'white' }}>"{r.feedback}"</p>
                                        <small style={{ color: 'var(--text-muted)' }}>— Reviewed by: {r.reviewerName}</small>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* --- MODAL FOR NEW REVIEWS --- */}
                {isAddingReview && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3 style={{ margin: '0 0 20px 0', color: 'white' }}>New Performance Review</h3>

                            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Score (1-5)</label>
                            <input type="number" min="1" max="5" className="form-input" value={newReviewScore} onChange={(e) => setNewReviewScore(e.target.value)} />

                            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)' }}>Manager Feedback</label>
                            <textarea className="form-input" rows="4" value={newReviewFeedback} onChange={(e) => setNewReviewFeedback(e.target.value)}></textarea>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button className="btn-secondary" onClick={() => setIsAddingReview(false)} disabled={isSubmitting}>Cancel</button>
                                <button className="btn-primary" onClick={submitReview} disabled={isSubmitting}>
                                    {isSubmitting ? "Saving..." : "Submit Review"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}