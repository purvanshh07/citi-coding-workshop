import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from './services/api';
import './App.css';

const REGION_LABEL = 'India / IST';

export default function App() {

    // ── State ─────────────────────────────────────────────────
    const [currentUser,      setCurrentUser]      = useState(null);
    const [employees,        setEmployees]        = useState([]);
    const [searchQuery,      setSearchQuery]      = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [reviews,          setReviews]          = useState([]);
    const [reviewsMap,       setReviewsMap]       = useState({});
    const [gapAnalysis,      setGapAnalysis]      = useState(null);

    // Auth
    const [authView,      setAuthView]      = useState('landing');
    const [loginEmail,    setLoginEmail]    = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginRole,     setLoginRole]     = useState('EMPLOYEE');
    const [loginError,    setLoginError]    = useState('');

    // Environment
    const [currentTime, setCurrentTime] = useState(new Date());

    // Review modal
    const [isAddingReview,    setIsAddingReview]    = useState(false);
    const [newReviewScore,    setNewReviewScore]    = useState('');
    const [newReviewFeedback, setNewReviewFeedback] = useState('');
    const [isSubmitting,      setIsSubmitting]      = useState(false);

    // Employee creation/deletion modal
    const [isCreatingEmployee,  setIsCreatingEmployee]  = useState(false);
    const [isDeleteConfirm,     setIsDeleteConfirm]     = useState(false);
    const [deleteConfirmEmployee, setDeleteConfirmEmployee] = useState(null);
    const [newEmployeeForm, setNewEmployeeForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        jobTitle: '',
        department: '',
        role: 'EMPLOYEE',
    });
    const [createEmployeeError, setCreateEmployeeError] = useState('');
    const [isCreatingLoading,   setIsCreatingLoading]   = useState(false);

    const carouselRef = useRef(null);

    // ── Clock ─────────────────────────────────────────────────
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ── Initial data load ─────────────────────────────────────
    useEffect(() => {
        api.getAllEmployees().then(async (data) => {
            if (data.length === 0) return;
            setEmployees(data);
            const rMap = {};
            for (const emp of data) {
                rMap[emp.id] = await api.getReviewsForEmployee(emp.id);
            }
            setReviewsMap(rMap);
        });
    }, []);

    // ── loadProfile ───────────────────────────────────────────
    const loadProfile = useCallback((employee) => {
        setSelectedEmployee(employee);
        setReviews([]);
        setGapAnalysis(null);
        let active = true;

        api.getReviewsForEmployee(employee.id).then((data) => {
            if (active) setReviews(Array.isArray(data) ? data : []);
        });
        api.getGapAnalysis(employee.id).then((data) => {
            if (active) {
                if (
                    data &&
                    Array.isArray(data.acquiredRequiredSkills) &&
                    Array.isArray(data.missingSkills)
                ) {
                    setGapAnalysis(data);
                } else {
                    setGapAnalysis(null);
                }
            }
        });
        return () => { active = false; };
    }, []);

    // ── Navigation (HR only) ──────────────────────────────────
    const handleGoHome = () => {
        if (currentUser?.role !== 'HR') return;
        setSelectedEmployee(null);
        setSearchQuery('');
        setSelectedDepartment('all');
        setReviews([]);
        setGapAnalysis(null);
    };

    // ── Get unique departments from employees ──────────────────
    const getDepartments = () => {
        const departments = new Set();
        employees.forEach(emp => {
            if (emp.department) {
                departments.add(emp.department);
            }
        });
        return Array.from(departments).sort();
    };

    // ── Auth ──────────────────────────────────────────────────
    // Clears everything so re-login always works cleanly after a failed attempt
    const handleBack = () => {
        setAuthView('landing');
        setLoginError('');
        setLoginEmail('');
        setLoginPassword('');
    };

    const handleAuthSubmit = async () => {
        setLoginError('');
        if (!loginEmail.includes('@')) {
            return setLoginError('Valid corporate email required.');
        }
        try {
            const userData = await api.login(loginEmail, loginPassword, loginRole);
            setCurrentUser({
                role: loginRole,
                name: `${userData.firstName} ${userData.lastName}`,
                id:   userData.id,
            });
            if (loginRole === 'EMPLOYEE') loadProfile(userData);
        } catch (err) {
            setLoginError(err.message || 'Authentication failed.');
        }
    };

    // ── Submit review ─────────────────────────────────────────
    const closeReviewModal = () => {
        setIsAddingReview(false);
        setNewReviewFeedback('');
        setNewReviewScore('');
    };

    const submitReview = async () => {
        if (!newReviewFeedback.trim() || !newReviewScore) return;
        setIsSubmitting(true);
        try {
            const payload = {
                employeeId:   selectedEmployee.id,
                reviewerName: currentUser.name,
                score:        parseInt(newReviewScore, 10) || 1,
                feedback:     newReviewFeedback,
            };
            const res = await fetch('http://localhost:8082/api/v1/reviews', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
            if (res.ok) {
                closeReviewModal();
                loadProfile(selectedEmployee);
                const fresh = await api.getReviewsForEmployee(selectedEmployee.id);
                setReviewsMap(prev => ({ ...prev, [selectedEmployee.id]: fresh }));
            }
        } catch (err) {
            console.error('Review submission error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Create Employee ───────────────────────────────────────
    const resetCreateEmployeeForm = () => {
        setNewEmployeeForm({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            jobTitle: '',
            department: '',
            role: 'EMPLOYEE',
        });
        setCreateEmployeeError('');
    };

    const closeCreateEmployeeModal = () => {
        setIsCreatingEmployee(false);
        resetCreateEmployeeForm();
    };

    const submitCreateEmployee = async () => {
        setCreateEmployeeError('');

        // Validation
        if (!newEmployeeForm.firstName.trim()) {
            return setCreateEmployeeError('First name is required.');
        }
        if (!newEmployeeForm.lastName.trim()) {
            return setCreateEmployeeError('Last name is required.');
        }
        if (!newEmployeeForm.email.includes('@')) {
            return setCreateEmployeeError('Valid email is required.');
        }
        if (!newEmployeeForm.password.trim() || newEmployeeForm.password.length < 4) {
            return setCreateEmployeeError('Password must be at least 4 characters.');
        }

        setIsCreatingLoading(true);
        try {
            await api.createEmployee(newEmployeeForm);
            closeCreateEmployeeModal();
            // Refresh employee list
            const updatedEmployees = await api.getAllEmployees();
            setEmployees(updatedEmployees);
            const rMap = {};
            for (const emp of updatedEmployees) {
                rMap[emp.id] = await api.getReviewsForEmployee(emp.id);
            }
            setReviewsMap(rMap);
        } catch (err) {
            setCreateEmployeeError(err.message || 'Failed to create employee.');
        } finally {
            setIsCreatingLoading(false);
        }
    };

    // ── Delete Employee ───────────────────────────────────────
    const startDeleteEmployee = (employee) => {
        setDeleteConfirmEmployee(employee);
        setIsDeleteConfirm(true);
    };

    const confirmDeleteEmployee = async () => {
        if (!deleteConfirmEmployee) return;

        setIsCreatingLoading(true);
        try {
            await api.deleteEmployee(deleteConfirmEmployee.id);
            setIsDeleteConfirm(false);
            setDeleteConfirmEmployee(null);
            // Refresh employee list
            const updatedEmployees = await api.getAllEmployees();
            setEmployees(updatedEmployees);
            const rMap = {};
            for (const emp of updatedEmployees) {
                rMap[emp.id] = await api.getReviewsForEmployee(emp.id);
            }
            setReviewsMap(rMap);
        } catch (err) {
            setCreateEmployeeError(err.message || 'Failed to delete employee.');
        } finally {
            setIsCreatingLoading(false);
        }
    };

    const cancelDeleteConfirm = () => {
        setIsDeleteConfirm(false);
        setDeleteConfirmEmployee(null);
    };

    // ── Carousel ──────────────────────────────────────────────
    const scrollCarousel = (direction) => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({
                left:     direction === 'left' ? -320 : 320,
                behavior: 'smooth',
            });
        }
    };

    const isHR = currentUser?.role === 'HR';

    // ═══════════════════════════════════════════════════════════
    // VIEW A — Landing / Login
    // ═══════════════════════════════════════════════════════════
    if (!currentUser) {
        return (
            <div style={{
                display: 'flex', height: '100vh', width: '100vw',
                background: '#07050f', overflow: 'hidden',
            }}>
                {/* Left — hero image */}
                <div style={{
                    flex: 1,
                    position: 'relative',
                    backgroundImage: 'url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}>
                    {/* gradient overlay */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(90deg, rgba(7,5,15,0.15) 0%, rgba(7,5,15,0.97) 100%)',
                    }} />

                    {/* Region badge on hero bottom-left */}
                    <div style={{
                        position: 'absolute', bottom: '40px', left: '40px',
                        background: 'rgba(139,92,246,0.12)',
                        border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: '8px',
                        padding: '10px 18px',
                        backdropFilter: 'blur(8px)',
                    }}>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            Serving Region
                        </p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--purple-accent)', fontWeight: 600 }}>
                            🇮🇳 {REGION_LABEL}
                        </p>
                    </div>
                </div>

                {/* Right — login panel
                    KEY FIX: flex column + space-between so footer is always
                    naturally at the bottom — no position:absolute needed */}
                <div style={{
                    width: '460px',
                    minWidth: '340px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: '#07050f',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                    padding: '60px',
                    boxSizing: 'border-box',
                }}>
                    {/* Top section: brand + form */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
                        <h1 className="brand" style={{
                            fontSize: '4.5rem', margin: '0 0 8px 0',
                            letterSpacing: '-3px', pointerEvents: 'none', cursor: 'default',
                        }}>
                            ACME.
                        </h1>

                        {authView === 'landing' ? (
                            <div style={{ animation: 'fadeIn 0.5s ease' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '40px' }}>
                                    Global Banking Infrastructure &amp; Analytics
                                </p>
                                <button className="btn-primary"
                                        style={{ width: '100%', padding: '16px' }}
                                        onClick={() => setAuthView('login')}>
                                    Sign In to Portal
                                </button>
                            </div>
                        ) : (
                            <div style={{ animation: 'fadeIn 0.4s ease' }}>
                                <h2 style={{ marginBottom: '25px', color: 'white', fontSize: '1.4rem' }}>
                                    Secure Login
                                </h2>

                                {loginError && (
                                    <p style={{
                                        color: '#fca5a5',
                                        background: 'rgba(239,68,68,0.1)',
                                        padding: '10px 14px', borderRadius: '6px',
                                        fontSize: '0.85rem', marginBottom: '18px',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        margin: '0 0 18px 0',
                                    }}>
                                        {loginError}
                                    </p>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                                    <select className="form-input"
                                            value={loginRole}
                                            onChange={(e) => setLoginRole(e.target.value)}>
                                        <option value="EMPLOYEE">Individual Employee</option>
                                        <option value="HR">HR Administrator</option>
                                    </select>

                                    <input className="form-input"
                                           placeholder="Corporate Email"
                                           value={loginEmail}
                                           onChange={(e) => setLoginEmail(e.target.value)} />

                                    <input className="form-input"
                                           type="password"
                                           placeholder="Password"
                                           value={loginPassword}
                                           onChange={(e) => setLoginPassword(e.target.value)}
                                           onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()} />

                                    <button className="btn-primary"
                                            style={{ marginTop: '6px', padding: '14px' }}
                                            onClick={handleAuthSubmit}>
                                        Authenticate Access
                                    </button>

                                    {/* Plain text back — never overlaps footer */}
                                    <button
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            padding: '2px 0',
                                            textAlign: 'left',
                                            width: 'fit-content',
                                        }}
                                        onClick={handleBack}>
                                        ← Back
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer — always at natural bottom, never overlaps */}
                    <div style={{
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        paddingTop: '20px',
                        flexShrink: 0,
                    }}>
                        <p style={{
                            fontSize: '0.63rem', color: 'rgba(255,255,255,0.25)',
                            lineHeight: '1.5', margin: '0 0 10px 0',
                        }}>
                            PROPRIETARY NOTICE: This portal is for authorized Acme Corp personnel only.
                            Unauthorized access is subject to criminal prosecution.
                        </p>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--purple-accent)',
                        }}>
                            <span>{currentTime.toLocaleTimeString()}</span>
                            <span>🇮🇳 {REGION_LABEL}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // VIEW B — Authenticated Dashboard
    // ═══════════════════════════════════════════════════════════
    return (
        <div className="overlay">
            <div className="app-container">

                {/* Top nav */}
                <nav className="top-nav">
                    {/* Logo: home navigation for HR only; purely decorative for employees */}
                    <div
                        className="brand"
                        onClick={isHR ? handleGoHome : undefined}
                        style={{ cursor: isHR ? 'pointer' : 'default' }}
                    >
                        ACME.
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {/* Live clock */}
                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            padding: '5px 14px', borderRadius: '20px',
                            fontSize: '0.8rem', color: '#34d399',
                            border: '1px solid rgba(52,211,153,0.2)',
                            whiteSpace: 'nowrap',
                        }}>
                            ● {currentTime.toLocaleTimeString()}
                        </div>

                        {/* Region */}
                        <div style={{
                            fontSize: '0.72rem', color: 'rgba(139,92,246,0.85)',
                            fontFamily: 'monospace', whiteSpace: 'nowrap',
                        }}>
                            🇮🇳 {REGION_LABEL}
                        </div>

                        {/* User info */}
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                {currentUser.name}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--purple-accent)' }}>
                                {currentUser.role}
                            </span>
                        </div>

                        <button className="btn-secondary"
                                onClick={() => {
                                    setCurrentUser(null);
                                    setAuthView('landing');
                                    setSelectedEmployee(null);
                                }}>
                            Sign Out
                        </button>
                    </div>
                </nav>

                {/* ── HR Dashboard: directory + carousel ── */}
                {!selectedEmployee && isHR && (
                    <div className="dashboard-split">
                        <div className="left-panel">
                            <h2 style={{ margin: '0 0 16px 0' }}>Directory</h2>
                            <button className="btn-primary"
                                    style={{
                                        padding: '8px 16px',
                                        fontSize: '0.75rem',
                                        marginBottom: '20px',
                                        width: '100%',
                                    }}
                                    onClick={() => setIsCreatingEmployee(true)}>
                                + New Employee
                            </button>
                            <input
                                className="search-bar"
                                placeholder="Find a team member..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                                    Filter by Department
                                </label>
                                <select
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.3s',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--purple-accent)'}
                                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                                >
                                    <option value="all">All Departments</option>
                                    {getDepartments().map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="search-results-container">
                                {employees
                                    .filter(e =>
                                        `${e.firstName} ${e.lastName}`
                                            .toLowerCase()
                                            .includes(searchQuery.toLowerCase()) &&
                                        (selectedDepartment === 'all' || e.department === selectedDepartment)
                                    )
                                    .map(emp => (
                                        <div key={emp.id}
                                             style={{
                                                 display: 'flex',
                                                 justifyContent: 'space-between',
                                                 alignItems: 'center',
                                                 gap: '10px',
                                             }}>
                                            <div
                                                className="search-result-item"
                                                onClick={() => loadProfile(emp)}
                                                style={{ flex: 1 }}>
                                                <img
                                                    src={`https://i.pravatar.cc/150?u=${emp.firstName}`}
                                                    style={{ width: '35px', borderRadius: '50%' }}
                                                    alt=""
                                                />
                                                <span>{emp.firstName} {emp.lastName}</span>
                                            </div>
                                            <button
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    color: '#fca5a5',
                                                    padding: '5px 10px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '600',
                                                    transition: 'all 0.2s',
                                                    flexShrink: 0,
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    startDeleteEmployee(emp);
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.target.style.background = 'rgba(239, 68, 68, 0.25)';
                                                    e.target.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.4)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.background = 'rgba(239, 68, 68, 0.15)';
                                                    e.target.style.boxShadow = 'none';
                                                }}>
                                                Delete
                                            </button>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        <div className="right-panel">
                            <div className="carousel-container" ref={carouselRef}>
                                {employees
                                    .filter(emp =>
                                        selectedDepartment === 'all' || emp.department === selectedDepartment
                                    )
                                    .map(emp => {
                                    const empReviews = Array.isArray(reviewsMap[emp.id]) ? reviewsMap[emp.id] : [];
                                    const firstReview = empReviews[0];
                                    return (
                                        <div key={emp.id} className="scroll-card">
                                            <div style={{
                                                display: 'flex',
                                                gap: '15px',
                                                alignItems: 'center',
                                                width: '100%',
                                                flexWrap: 'wrap',
                                                justifyContent: 'flex-start',
                                            }}>
                                                <img
                                                    src={`https://i.pravatar.cc/150?u=${emp.firstName}`}
                                                    style={{
                                                        width: 'clamp(50px, 12vw, 100px)',
                                                        height: 'clamp(50px, 12vw, 100px)',
                                                        borderRadius: '50%',
                                                        border: '2px solid var(--purple-accent)',
                                                        flexShrink: 0,
                                                        objectFit: 'cover',
                                                    }}
                                                    alt=""
                                                />
                                                <div style={{ flex: 1, minWidth: '150px' }}>
                                                    <h3 style={{
                                                        margin: 0,
                                                        fontSize: 'clamp(1rem, 3vw, 1.5rem)',
                                                        wordBreak: 'break-word',
                                                    }}>
                                                        {emp.firstName} {emp.lastName}
                                                    </h3>
                                                    <small style={{
                                                        color: 'var(--purple-accent)',
                                                        fontSize: 'clamp(0.7rem, 2vw, 0.9rem)',
                                                        display: 'block',
                                                        marginTop: '4px',
                                                    }}>
                                                        {emp.jobTitle}
                                                    </small>
                                                </div>
                                            </div>
                                            <div className="card-review-preview" style={{
                                                margin: 'auto 0 15px 0',
                                                fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
                                                flex: '1 1 auto',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}>
                                                {firstReview ? (
                                                    <p style={{ margin: 0, wordBreak: 'break-word' }}>
                                                        ⭐ {firstReview.score ?? 'N/A'} —&nbsp;
                                                        "{String(firstReview.feedback ?? '').substring(0, 35)}..."
                                                    </p>
                                                ) : (
                                                    <p style={{ margin: 0, opacity: 0.5 }}>No recent reviews.</p>
                                                )}
                                            </div>
                                            <button className="btn-primary"
                                                    style={{
                                                        width: '100%',
                                                        padding: 'clamp(10px, 2vw, 14px)',
                                                        fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
                                                        flexShrink: 0,
                                                    }}
                                                    onClick={() => loadProfile(emp)}>
                                                View Full Profile
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Detailed Profile View (HR + Employee) ── */}
                {selectedEmployee && (
                    <div style={{ width: '100%', boxSizing: 'border-box' }}>

                        {/* ← Directory only shown to HR */}
                        {isHR && (
                            <button className="btn-secondary"
                                    style={{ marginBottom: '28px' }}
                                    onClick={handleGoHome}>
                                ← Directory
                            </button>
                        )}

                        {/* Profile hero — centered */}
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <img
                                src={`https://i.pravatar.cc/150?u=${selectedEmployee.firstName}`}
                                className="avatar"
                                alt={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
                            />
                            <h2 style={{ fontSize: '2.8rem', margin: '10px 0 6px' }}>
                                {selectedEmployee.firstName} {selectedEmployee.lastName}
                            </h2>
                            <p style={{ color: 'var(--purple-accent)', fontSize: '1.1rem', margin: 0 }}>
                                {selectedEmployee.jobTitle ?? 'Employee'} | {selectedEmployee.department ?? '—'}
                            </p>
                        </div>

                        {/* Two-column grid — collapses to single on mobile */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: '24px',
                            width: '100%',
                        }}>
                            {/* Gap Analysis */}
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '28px', borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.07)',
                            }}>
                                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Training Gap </h3>
                                {gapAnalysis === null ? (
                                    <p style={{ opacity: 0.4 }}>Loading skills data…</p>
                                ) : (
                                    !Array.isArray(gapAnalysis.acquiredRequiredSkills) &&
                                    !Array.isArray(gapAnalysis.missingSkills)
                                ) ? (
                                    <p style={{ opacity: 0.4 }}>No training data available.</p>
                                ) : (
                                    <div style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>
                                        <p style={{ color: '#34d399', margin: '0 0 8px' }}>
                                            ✓ {(gapAnalysis.acquiredRequiredSkills ?? []).join(', ') || 'None yet'}
                                        </p>
                                        <p style={{ color: '#f87171', margin: '0 0 8px' }}>
                                            ⚠ {(gapAnalysis.missingSkills ?? []).join(', ') || 'No gaps — promotion ready!'}
                                        </p>
                                        {gapAnalysis.promotionReady && (
                                            <p style={{ marginTop: '12px', color: '#34d399', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                🎉 Promotion Ready
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Performance Reviews */}
                            <div style={{
                                background: 'rgba(255,255,255,0.03)',
                                padding: '28px', borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.07)',
                            }}>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', marginBottom: '16px',
                                }}>
                                    <h3 style={{ margin: 0 }}>Review</h3>
                                    {isHR && (
                                        <button className="btn-primary"
                                                style={{ padding: '5px 14px', fontSize: '0.8rem' }}
                                                onClick={() => setIsAddingReview(true)}>
                                            + Add
                                        </button>
                                    )}
                                </div>
                                {!Array.isArray(reviews) || reviews.length === 0 ? (
                                    <p style={{ opacity: 0.4 }}>No performance records found.</p>
                                ) : (
                                    reviews.slice(0, 3).map(r => (
                                        <div key={r.id ?? Math.random()} className="review-item">
                                            <strong>⭐ {r.score ?? 'N/A'}</strong>
                                            &nbsp;—&nbsp;
                                            {r.feedback ?? 'No feedback provided.'}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Employee waiting state ── */}
                {!selectedEmployee && !isHR && (
                    <div style={{ textAlign: 'center', marginTop: '80px', opacity: 0.4 }}>
                        <p>Your profile is loading…</p>
                    </div>
                )}

            </div>

            {/* ── Delete Confirmation Modal ── */}
            {isDeleteConfirm && deleteConfirmEmployee && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '320px' }}>
                        <h3 style={{ marginTop: 0, color: '#f87171' }}>Delete Employee?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            Are you sure you want to permanently delete <strong>{deleteConfirmEmployee.firstName} {deleteConfirmEmployee.lastName}</strong>? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button
                                style={{
                                    flex: 1,
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    color: '#fca5a5',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                }}
                                onClick={confirmDeleteEmployee}
                                disabled={isCreatingLoading}
                                onMouseEnter={(e) => {
                                    if (!isCreatingLoading) {
                                        e.target.style.background = 'rgba(239, 68, 68, 0.35)';
                                        e.target.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.5)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isCreatingLoading) {
                                        e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                                        e.target.style.boxShadow = 'none';
                                    }
                                }}>
                                {isCreatingLoading ? 'Deleting…' : 'Delete'}
                            </button>
                            <button className="btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={cancelDeleteConfirm}
                                    disabled={isCreatingLoading}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create Employee Modal ── */}
            {isCreatingEmployee && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0 }}>Create New Employee</h3>

                        {createEmployeeError && (
                            <p style={{
                                color: '#fca5a5',
                                background: 'rgba(239,68,68,0.1)',
                                padding: '10px 14px', borderRadius: '6px',
                                fontSize: '0.85rem', marginBottom: '18px',
                                border: '1px solid rgba(239,68,68,0.2)',
                                margin: '0 0 18px 0',
                            }}>
                                {createEmployeeError}
                            </p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                    First Name
                                </label>
                                <input
                                    className="form-input"
                                    placeholder="John"
                                    value={newEmployeeForm.firstName}
                                    onChange={(e) => setNewEmployeeForm({...newEmployeeForm, firstName: e.target.value})}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                    Last Name
                                </label>
                                <input
                                    className="form-input"
                                    placeholder="Doe"
                                    value={newEmployeeForm.lastName}
                                    onChange={(e) => setNewEmployeeForm({...newEmployeeForm, lastName: e.target.value})}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                    Email
                                </label>
                                <input
                                    className="form-input"
                                    placeholder="john.doe@acme.com"
                                    type="email"
                                    value={newEmployeeForm.email}
                                    onChange={(e) => setNewEmployeeForm({...newEmployeeForm, email: e.target.value})}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                    Password
                                </label>
                                <input
                                    className="form-input"
                                    placeholder="••••••••"
                                    type="password"
                                    value={newEmployeeForm.password}
                                    onChange={(e) => setNewEmployeeForm({...newEmployeeForm, password: e.target.value})}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                    Job Title
                                </label>
                                <input
                                    className="form-input"
                                    placeholder="Senior Engineer"
                                    value={newEmployeeForm.jobTitle}
                                    onChange={(e) => setNewEmployeeForm({...newEmployeeForm, jobTitle: e.target.value})}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                    Department
                                </label>
                                <input
                                    className="form-input"
                                    placeholder="Engineering"
                                    value={newEmployeeForm.department}
                                    onChange={(e) => setNewEmployeeForm({...newEmployeeForm, department: e.target.value})}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                    Role
                                </label>
                                <select
                                    className="form-input"
                                    value={newEmployeeForm.role}
                                    onChange={(e) => setNewEmployeeForm({...newEmployeeForm, role: e.target.value})}>
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="HR">HR Administrator</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button className="btn-primary"
                                        style={{ flex: 1 }}
                                        onClick={submitCreateEmployee}
                                        disabled={isCreatingLoading}>
                                    {isCreatingLoading ? 'Creating…' : 'Create Employee'}
                                </button>
                                <button className="btn-secondary"
                                        style={{ flex: 1 }}
                                        onClick={closeCreateEmployeeModal}
                                        disabled={isCreatingLoading}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Review Modal ── */}
            {isAddingReview && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 style={{ marginTop: 0 }}>Performance Audit</h3>

                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rating (1–5)</label>
                        <input
                            type="number"
                            min="1" max="5"
                            className="form-input"
                            placeholder="Enter rating on a scale of 1–5"
                            value={newReviewScore}
                            onChange={(e) => setNewReviewScore(e.target.value)}
                        />

                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                            Observation
                        </label>
                        <textarea
                            className="form-input"
                            rows="4"
                            placeholder="Enter your feedback here..."
                            value={newReviewFeedback}
                            onChange={(e) => setNewReviewFeedback(e.target.value)}
                        />

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button className="btn-primary"
                                    onClick={submitReview}
                                    disabled={isSubmitting || !newReviewScore || !newReviewFeedback.trim()}>
                                {isSubmitting ? 'Saving…' : 'Confirm'}
                            </button>
                            <button className="btn-secondary" onClick={closeReviewModal}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}