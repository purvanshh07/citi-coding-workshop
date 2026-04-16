import { useState, useEffect, useRef, useCallback } from 'react';
import {
    ResponsiveContainer, LineChart, Line,
    XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { api } from './services/api';
import './App.css';

const REGION_LABEL = 'India / IST';

// ── Department stroke colors for multi-line org chart ────────
const DEPT_COLORS = [
    '#8b5cf6', // purple
    '#34d399', // green
    '#60a5fa', // blue
    '#f472b6', // pink
    '#fb923c', // orange
    '#facc15', // yellow
    '#a78bfa', // lavender
    '#2dd4bf', // teal
];

// ── Recharts custom tooltip (dark theme) ────────────────────
const DarkTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#0f0c1a',
            border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.82rem',
        }}>
            <p style={{ margin: '0 0 6px', color: '#a78bfa', fontWeight: 600 }}>
                {label}
            </p>
            {payload.map((entry) => (
                <p key={entry.dataKey} style={{ margin: '2px 0', color: entry.color }}>
                    {entry.name}: <strong>{Number(entry.value).toFixed(2)}</strong> / 5
                </p>
            ))}
        </div>
    );
};

export default function App() {

    // ── State ─────────────────────────────────────────────────
    const [currentUser,        setCurrentUser]        = useState(null);
    const [employees,          setEmployees]          = useState([]);
    const [searchQuery,        setSearchQuery]        = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [selectedEmployee,   setSelectedEmployee]   = useState(null);
    const [reviews,            setReviews]            = useState([]);
    const [reviewsMap,         setReviewsMap]         = useState({});
    const [gapAnalysis,        setGapAnalysis]        = useState(null);   // RESTORED
    const [viewMode,           setViewMode]           = useState('directory');

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

    // Employee CRUD
    const [isCreatingEmployee,    setIsCreatingEmployee]    = useState(false);
    const [isDeleteConfirm,       setIsDeleteConfirm]       = useState(false);
    const [deleteConfirmEmployee, setDeleteConfirmEmployee] = useState(null);
    const [newEmployeeForm,       setNewEmployeeForm]       = useState({
        firstName: '', lastName: '', email: '', password: '',
        jobTitle: '', department: '', role: 'EMPLOYEE',
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
            if (!data.length) return;
            setEmployees(data);
            const rMap = {};
            for (const emp of data) {
                rMap[emp.id] = await api.getReviewsForEmployee(emp.id);
            }
            setReviewsMap(rMap);
        });
    }, []);

    // ── loadProfile — RESTORED with gapAnalysis call ─────────
    const loadProfile = useCallback((employee) => {
        setSelectedEmployee(employee);
        setReviews([]);
        setGapAnalysis(null);
        let active = true;

        api.getReviewsForEmployee(employee.id).then((data) => {
            if (active) setReviews(Array.isArray(data) ? data : []);
        });

        // RESTORED: Gap analysis call to Port 8083
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

    // ── Navigation ────────────────────────────────────────────
    const handleGoHome = () => {
        if (currentUser?.role !== 'HR') return;
        setSelectedEmployee(null);
        setSearchQuery('');
        setSelectedDepartment('all');
        setViewMode('directory');
        setReviews([]);
        setGapAnalysis(null);
    };

    const getDepartments = () => {
        const seen = new Set();
        employees.forEach(e => { if (e.department) seen.add(e.department.trim()); });
        return Array.from(seen).sort();
    };

    // ── Auth ──────────────────────────────────────────────────
    const handleBack = () => {
        setAuthView('landing');
        setLoginError('');
        setLoginEmail('');
        setLoginPassword('');
    };

    const handleAuthSubmit = async () => {
        setLoginError('');
        if (!loginEmail.includes('@')) return setLoginError('Valid corporate email required.');
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

    // ── Review modal ──────────────────────────────────────────
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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

    // ── Employee CRUD helpers ─────────────────────────────────
    const resetCreateEmployeeForm = () => {
        setNewEmployeeForm({ firstName:'', lastName:'', email:'', password:'', jobTitle:'', department:'', role:'EMPLOYEE' });
        setCreateEmployeeError('');
    };
    const closeCreateEmployeeModal = () => { setIsCreatingEmployee(false); resetCreateEmployeeForm(); };

    const refreshEmployeeList = async () => {
        const updated = await api.getAllEmployees();
        setEmployees(updated);
        const rMap = {};
        for (const emp of updated) rMap[emp.id] = await api.getReviewsForEmployee(emp.id);
        setReviewsMap(rMap);
    };

    const submitCreateEmployee = async () => {
        setCreateEmployeeError('');
        if (!newEmployeeForm.firstName.trim())                                    return setCreateEmployeeError('First name is required.');
        if (!newEmployeeForm.lastName.trim())                                     return setCreateEmployeeError('Last name is required.');
        if (!newEmployeeForm.email.includes('@'))                                 return setCreateEmployeeError('Valid email is required.');
        if (!newEmployeeForm.password.trim() || newEmployeeForm.password.length < 4) return setCreateEmployeeError('Password must be at least 4 characters.');
        setIsCreatingLoading(true);
        try {
            await api.createEmployee(newEmployeeForm);
            closeCreateEmployeeModal();
            await refreshEmployeeList();
        } catch (err) {
            setCreateEmployeeError(err.message || 'Failed to create employee.');
        } finally {
            setIsCreatingLoading(false);
        }
    };

    const confirmDeleteEmployee = async () => {
        if (!deleteConfirmEmployee) return;
        setIsCreatingLoading(true);
        try {
            await api.deleteEmployee(deleteConfirmEmployee.id);
            setIsDeleteConfirm(false);
            setDeleteConfirmEmployee(null);
            await refreshEmployeeList();
        } catch (err) {
            setCreateEmployeeError(err.message || 'Failed to delete employee.');
        } finally {
            setIsCreatingLoading(false);
        }
    };

    const scrollCarousel = (dir) => {
        carouselRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
    };

    // ── Analytics data helpers (FIXED: case-insensitive + true averages) ──

    /**
     * Builds recharts-ready rows for the multi-line department chart.
     * Key fix: normalise dept names to lowercase before grouping so
     * "Engineering" and "engineering" are treated as one bucket.
     * Average = total / count (never a raw sum).
     *
     * Returns:
     *   rows  — [{ year: 2024, Engineering: 3.8, Marketing: 4.1 }, …]
     *   depts — ['Engineering', 'Marketing', …]  (display names, deduplicated)
     */
    const getMultiLineDeptData = () => {
        // stats[normDept][year] = { total, count, display }
        const stats = {};
        const displayNames = {};

        employees.forEach(emp => {
            if (!emp.department) return;
            const norm    = emp.department.trim().toLowerCase();
            const display = emp.department.trim();
            displayNames[norm] = display;
            if (!stats[norm]) stats[norm] = {};

            (reviewsMap[emp.id] ?? []).forEach(r => {
                const yr = r.reviewDate
                    ? new Date(r.reviewDate).getFullYear()
                    : new Date().getFullYear();
                if (!stats[norm][yr]) stats[norm][yr] = { total: 0, count: 0 };
                stats[norm][yr].total += r.score ?? 0;
                stats[norm][yr].count += 1;
            });
        });

        // Collect every year that appears across all departments
        const allYears = new Set();
        Object.values(stats).forEach(yearMap =>
            Object.keys(yearMap).forEach(y => allYears.add(parseInt(y)))
        );

        const rows = Array.from(allYears).sort().map(yr => {
            const row = { year: yr };
            Object.entries(stats).forEach(([norm, yearMap]) => {
                const display = displayNames[norm];
                if (yearMap[yr]?.count > 0) {
                    row[display] = parseFloat((yearMap[yr].total / yearMap[yr].count).toFixed(2));
                }
                // Intentionally omit the key when there's no data for that year
                // so recharts renders a gap instead of a 0
            });
            return row;
        });

        const depts = Object.values(displayNames);
        return { rows, depts };
    };

    /** Summary tiles — one average per department (all years combined). */
    const getDepartmentAverages = () => {
        const stats = {};
        employees.forEach(emp => {
            if (!emp.department) return;
            const norm    = emp.department.trim().toLowerCase();
            const display = emp.department.trim();
            if (!stats[norm]) stats[norm] = { display, total: 0, count: 0 };
            (reviewsMap[emp.id] ?? []).forEach(r => {
                stats[norm].total += r.score ?? 0;
                stats[norm].count += 1;
            });
        });
        return Object.values(stats)
            .map(s => ({ department: s.display, average: s.count > 0 ? parseFloat((s.total / s.count).toFixed(2)) : 0, count: s.count }))
            .sort((a, b) => b.average - a.average);
    };

    /** Single-employee yearly average for the profile line chart. */
    const getEmployeeChartData = (reviewsList) => {
        const byYear = {};
        reviewsList.forEach(r => {
            const yr = r.reviewDate
                ? new Date(r.reviewDate).getFullYear()
                : new Date().getFullYear();
            if (!byYear[yr]) byYear[yr] = { total: 0, count: 0 };
            byYear[yr].total += r.score ?? 0;
            byYear[yr].count += 1;
        });
        return Object.keys(byYear)
            .sort((a, b) => a - b)
            .map(yr => ({
                year:  parseInt(yr),
                score: parseFloat((byYear[yr].total / byYear[yr].count).toFixed(2)),
            }));
    };

    /** Group reviews by year for the text list display. */
    const groupReviewsByYear = (reviewsList) => {
        const grouped = {};
        reviewsList.forEach(r => {
            const yr = r.reviewDate
                ? new Date(r.reviewDate).getFullYear()
                : new Date().getFullYear();
            if (!grouped[yr]) grouped[yr] = [];
            grouped[yr].push(r);
        });
        return Object.keys(grouped).sort((a, b) => b - a)
            .map(yr => ({ year: parseInt(yr), reviews: grouped[yr] }));
    };

    const isHR = currentUser?.role === 'HR';

    // ═══════════════════════════════════════════════════════════
    // VIEW A — Landing / Login
    // ═══════════════════════════════════════════════════════════
    if (!currentUser) {
        return (
            <div style={{ display:'flex', height:'100vh', width:'100vw', background:'#07050f', overflow:'hidden' }}>
                {/* Left hero */}
                <div style={{
                    flex: 1, position: 'relative',
                    backgroundImage: 'url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop)',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                }}>
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, rgba(7,5,15,0.15) 0%, rgba(7,5,15,0.97) 100%)' }} />
                    <div style={{
                        position:'absolute', bottom:'40px', left:'40px',
                        background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.3)',
                        borderRadius:'8px', padding:'10px 18px', backdropFilter:'blur(8px)',
                    }}>
                        <p style={{ margin:0, fontSize:'0.65rem', color:'rgba(255,255,255,0.4)', letterSpacing:'1px', textTransform:'uppercase' }}>Serving Region</p>
                        <p style={{ margin:0, fontSize:'0.9rem', color:'var(--purple-accent)', fontWeight:600 }}>🇮🇳 {REGION_LABEL}</p>
                    </div>
                </div>

                {/* Right login panel */}
                <div style={{
                    width:'460px', minWidth:'340px',
                    display:'flex', flexDirection:'column', justifyContent:'space-between',
                    background:'#07050f', borderLeft:'1px solid rgba(255,255,255,0.08)',
                    padding:'60px', boxSizing:'border-box',
                }}>
                    <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', flex:1 }}>
                        <h1 className="brand" style={{ fontSize:'4.5rem', margin:'0 0 8px 0', letterSpacing:'-3px', pointerEvents:'none', cursor:'default' }}>
                            ACME.
                        </h1>

                        {authView === 'landing' ? (
                            <div style={{ animation:'fadeIn 0.5s ease' }}>
                                <p style={{ color:'var(--text-muted)', fontSize:'1.1rem', marginBottom:'40px' }}>
                                    Global Banking Infrastructure &amp; Analytics
                                </p>
                                <button className="btn-primary" style={{ width:'100%', padding:'16px' }} onClick={() => setAuthView('login')}>
                                    Sign In to Portal
                                </button>
                            </div>
                        ) : (
                            <div style={{ animation:'fadeIn 0.4s ease' }}>
                                <h2 style={{ marginBottom:'25px', color:'white', fontSize:'1.4rem' }}>Secure Login</h2>
                                {loginError && (
                                    <p style={{ color:'#fca5a5', background:'rgba(239,68,68,0.1)', padding:'10px 14px', borderRadius:'6px', fontSize:'0.85rem', border:'1px solid rgba(239,68,68,0.2)', margin:'0 0 18px 0' }}>
                                        {loginError}
                                    </p>
                                )}
                                <div style={{ display:'flex', flexDirection:'column', gap:'13px' }}>
                                    <select className="form-input" value={loginRole} onChange={(e) => setLoginRole(e.target.value)}>
                                        <option value="EMPLOYEE">Individual Employee</option>
                                        <option value="HR">HR Administrator</option>
                                    </select>
                                    <input className="form-input" placeholder="Corporate Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                                    <input className="form-input" type="password" placeholder="Password" value={loginPassword}
                                           onChange={(e) => setLoginPassword(e.target.value)}
                                           onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()} />
                                    <button className="btn-primary" style={{ marginTop:'6px', padding:'14px' }} onClick={handleAuthSubmit}>
                                        Authenticate Access
                                    </button>
                                    <button style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'0.85rem', padding:'2px 0', textAlign:'left', width:'fit-content' }} onClick={handleBack}>
                                        ← Back
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:'20px', flexShrink:0 }}>
                        <p style={{ fontSize:'0.63rem', color:'rgba(255,255,255,0.25)', lineHeight:'1.5', margin:'0 0 10px 0' }}>
                            PROPRIETARY NOTICE: This portal is for authorized Acme Corp personnel only.
                            Unauthorized access is subject to criminal prosecution.
                        </p>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', fontFamily:'monospace', color:'var(--purple-accent)' }}>
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
    const { rows: multiLineRows, depts: multiLineDepts } = getMultiLineDeptData();

    return (
        <div className="overlay">
            <div className="app-container">

                {/* Top nav */}
                <nav className="top-nav">
                    <div className="brand" onClick={isHR ? handleGoHome : undefined} style={{ cursor: isHR ? 'pointer' : 'default' }}>
                        ACME.
                    </div>
                    <div style={{ display:'flex', gap:'16px', alignItems:'center' }}>
                        <div style={{ background:'rgba(255,255,255,0.05)', padding:'5px 14px', borderRadius:'20px', fontSize:'0.8rem', color:'#34d399', border:'1px solid rgba(52,211,153,0.2)', whiteSpace:'nowrap' }}>
                            ● {currentTime.toLocaleTimeString()}
                        </div>
                        <div style={{ fontSize:'0.72rem', color:'rgba(139,92,246,0.85)', fontFamily:'monospace', whiteSpace:'nowrap' }}>
                            🇮🇳 {REGION_LABEL}
                        </div>
                        {isHR && (
                            <button
                                style={{
                                    background: viewMode === 'analytics' ? 'var(--purple-accent)' : 'rgba(255,255,255,0.05)',
                                    border: viewMode === 'analytics' ? '1px solid var(--purple-accent)' : '1px solid rgba(255,255,255,0.2)',
                                    color:'white', padding:'8px 16px', borderRadius:'6px', cursor:'pointer',
                                    fontSize:'0.8rem', fontWeight:'600', transition:'all 0.3s',
                                }}
                                onClick={() => { setViewMode(viewMode === 'analytics' ? 'directory' : 'analytics'); setSelectedEmployee(null); }}>
                                📊 Dashboard
                            </button>
                        )}
                        <div style={{ textAlign:'right' }}>
                            <span style={{ display:'block', fontWeight:'bold', fontSize:'0.95rem' }}>{currentUser.name}</span>
                            <span style={{ fontSize:'0.72rem', color:'var(--purple-accent)' }}>{currentUser.role}</span>
                        </div>
                        <button className="btn-secondary" onClick={() => { setCurrentUser(null); setAuthView('landing'); setSelectedEmployee(null); }}>
                            Sign Out
                        </button>
                    </div>
                </nav>

                {/* ── ANALYTICS VIEW ── */}
                {isHR && viewMode === 'analytics' && (
                    <div style={{ width:'100%', boxSizing:'border-box' }}>
                        <h2 style={{ marginBottom:'30px', fontSize:'2rem' }}>Organization Analytics</h2>

                        {/* Department average tiles */}
                        <div style={{
                            background:'rgba(255,255,255,0.03)', padding:'28px',
                            borderRadius:'16px', border:'1px solid rgba(255,255,255,0.07)',
                            marginBottom:'30px',
                        }}>
                            <h3 style={{ marginTop:0, marginBottom:'20px' }}>Department Averages</h3>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'16px' }}>
                                {getDepartmentAverages().length === 0 ? (
                                    <p style={{ opacity:0.5 }}>No review data available.</p>
                                ) : getDepartmentAverages().map((dept, i) => (
                                    <div key={dept.department} style={{
                                        background:'rgba(255,255,255,0.04)', borderRadius:'10px',
                                        padding:'14px 18px', border:`1px solid ${DEPT_COLORS[i % DEPT_COLORS.length]}33`,
                                    }}>
                                        <p style={{ margin:'0 0 4px', fontSize:'0.8rem', color:'rgba(255,255,255,0.5)' }}>{dept.department}</p>
                                        <p style={{ margin:0, fontSize:'1.6rem', fontWeight:700, color: DEPT_COLORS[i % DEPT_COLORS.length] }}>
                                            {dept.average.toFixed(2)}<span style={{ fontSize:'0.85rem', opacity:0.6 }}>/5</span>
                                        </p>
                                        <p style={{ margin:'4px 0 0', fontSize:'0.72rem', opacity:0.5 }}>{dept.count} review{dept.count !== 1 ? 's' : ''}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Multi-line department chart — full width */}
                        <div style={{
                            background:'rgba(255,255,255,0.03)', padding:'28px',
                            borderRadius:'16px', border:'1px solid rgba(255,255,255,0.07)',
                        }}>
                            <h3 style={{ marginTop:0, marginBottom:'24px' }}>Department Performance Over Time</h3>
                            {multiLineRows.length === 0 ? (
                                <p style={{ opacity:0.5, textAlign:'center', padding:'40px 0' }}>No review data available yet.</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={multiLineRows} margin={{ top:10, right:30, left:0, bottom:10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                                        <XAxis
                                            dataKey="year"
                                            stroke="rgba(255,255,255,0.3)"
                                            tick={{ fill:'rgba(255,255,255,0.5)', fontSize:12 }}
                                        />
                                        <YAxis
                                            domain={[0, 5]}
                                            ticks={[0, 1, 2, 3, 4, 5]}
                                            stroke="rgba(255,255,255,0.3)"
                                            tick={{ fill:'rgba(255,255,255,0.5)', fontSize:12 }}
                                        />
                                        <Tooltip content={<DarkTooltip />} />
                                        <Legend wrapperStyle={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.6)', paddingTop:'16px' }} />
                                        {multiLineDepts.map((dept, i) => (
                                            <Line
                                                key={dept}
                                                type="monotone"
                                                dataKey={dept}
                                                name={dept}
                                                stroke={DEPT_COLORS[i % DEPT_COLORS.length]}
                                                strokeWidth={2.5}
                                                dot={{ r:5, fill: DEPT_COLORS[i % DEPT_COLORS.length], strokeWidth:0 }}
                                                activeDot={{ r:7 }}
                                                connectNulls
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                )}

                {/* ── HR DIRECTORY VIEW ── */}
                {!selectedEmployee && isHR && viewMode === 'directory' && (
                    <div className="dashboard-split">
                        <div className="left-panel">
                            <h2 style={{ margin:'0 0 16px 0' }}>Directory</h2>
                            <button className="btn-primary" style={{ padding:'8px 16px', fontSize:'0.75rem', marginBottom:'20px', width:'100%' }} onClick={() => setIsCreatingEmployee(true)}>
                                + New Employee
                            </button>
                            <input className="search-bar" placeholder="Find a team member..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            <div style={{ marginBottom:'16px' }}>
                                <label style={{ fontSize:'0.8rem', color:'var(--text-muted)', display:'block', marginBottom:'8px' }}>Filter by Department</label>
                                <select
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    style={{ width:'100%', padding:'10px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', color:'white', fontSize:'0.9rem', cursor:'pointer' }}>
                                    <option value="all">All Departments</option>
                                    {getDepartments().map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="search-results-container">
                                {employees
                                    .filter(e =>
                                        `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) &&
                                        (selectedDepartment === 'all' || e.department === selectedDepartment)
                                    )
                                    .map(emp => (
                                        <div key={emp.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px' }}>
                                            <div className="search-result-item" onClick={() => loadProfile(emp)} style={{ flex:1 }}>
                                                <img src={`https://i.pravatar.cc/150?u=${emp.firstName}`} style={{ width:'35px', borderRadius:'50%' }} alt="" />
                                                <span>{emp.firstName} {emp.lastName}</span>
                                            </div>
                                            <button
                                                style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', padding:'5px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'0.7rem', fontWeight:'600', flexShrink:0 }}
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmEmployee(emp); setIsDeleteConfirm(true); }}>
                                                Delete
                                            </button>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* Carousel */}
                        <div className="right-panel">
                            <div className="carousel-container" ref={carouselRef}>
                                {employees
                                    .filter(emp => selectedDepartment === 'all' || emp.department === selectedDepartment)
                                    .map(emp => {
                                        const empReviews  = Array.isArray(reviewsMap[emp.id]) ? reviewsMap[emp.id] : [];
                                        const firstReview = empReviews[0];
                                        return (
                                            <div key={emp.id} className="scroll-card">
                                                <div style={{ display:'flex', gap:'15px', alignItems:'center' }}>
                                                    <img src={`https://i.pravatar.cc/150?u=${emp.firstName}`} style={{ width:'60px', height:'60px', borderRadius:'50%', border:'2px solid var(--purple-accent)', objectFit:'cover', flexShrink:0 }} alt="" />
                                                    <div>
                                                        <h3 style={{ margin:0 }}>{emp.firstName} {emp.lastName}</h3>
                                                        <small style={{ color:'var(--purple-accent)' }}>{emp.jobTitle}</small>
                                                    </div>
                                                </div>
                                                <div className="card-review-preview">
                                                    {firstReview ? (
                                                        <p style={{ margin:0 }}>⭐ {firstReview.score ?? 'N/A'} — "{String(firstReview.feedback ?? '').substring(0, 35)}..."</p>
                                                    ) : (
                                                        <p style={{ margin:0, opacity:0.5 }}>No recent reviews.</p>
                                                    )}
                                                </div>
                                                <button className="btn-primary" style={{ width:'100%' }} onClick={() => loadProfile(emp)}>
                                                    View Full Profile
                                                </button>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    </div>
                )}

                {/* ── EMPLOYEE PROFILE VIEW ── */}
                {selectedEmployee && (
                    <div style={{ width:'100%', boxSizing:'border-box' }}>
                        {isHR && (
                            <button className="btn-secondary" style={{ marginBottom:'28px' }} onClick={handleGoHome}>
                                ← Directory
                            </button>
                        )}

                        {/* TOP ROW: Employee info + Skills side by side */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', marginBottom:'28px' }}>

                            {/* Employee details card */}
                            <div style={{ background:'rgba(255,255,255,0.03)', padding:'32px', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
                                <img src={`https://i.pravatar.cc/150?u=${selectedEmployee.firstName}`} className="avatar" alt={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`} />
                                <h2 style={{ fontSize:'2.2rem', margin:'10px 0 6px' }}>
                                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                                </h2>
                                <p style={{ color:'var(--purple-accent)', fontSize:'1rem', margin:0 }}>
                                    {selectedEmployee.jobTitle ?? 'Employee'} | {selectedEmployee.department ?? '—'}
                                </p>
                            </div>

                            {/* Skills / Gap Analysis card — RESTORED */}
                            <div style={{ background:'rgba(255,255,255,0.03)', padding:'28px', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.07)' }}>
                                <h3 style={{ marginTop:0, marginBottom:'16px' }}>Skills &amp; Training Gap</h3>

                                {gapAnalysis === null ? (
                                    <p style={{ opacity:0.5 }}>Loading skills data from Port 8083…</p>
                                ) : (!Array.isArray(gapAnalysis.acquiredRequiredSkills) && !Array.isArray(gapAnalysis.missingSkills)) ? (
                                    <p style={{ opacity:0.5 }}>No training data available.</p>
                                ) : (
                                    <div style={{ fontSize:'0.95rem' }}>
                                        <p style={{ margin:'0 0 8px', fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'1px' }}>Acquired</p>
                                        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'20px' }}>
                                            {(gapAnalysis.acquiredRequiredSkills ?? []).length === 0 ? (
                                                <span style={{ opacity:0.4, fontSize:'0.9rem' }}>None yet</span>
                                            ) : (gapAnalysis.acquiredRequiredSkills ?? []).map(skill => (
                                                <span key={skill} style={{ background:'rgba(52,211,153,0.15)', color:'#34d399', border:'1px solid rgba(52,211,153,0.3)', borderRadius:'20px', padding:'4px 12px', fontSize:'0.82rem', fontWeight:600 }}>
                                                    ✓ {skill}
                                                </span>
                                            ))}
                                        </div>

                                        <p style={{ margin:'0 0 8px', fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'1px' }}>Missing</p>
                                        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'16px' }}>
                                            {(gapAnalysis.missingSkills ?? []).length === 0 ? (
                                                <span style={{ background:'rgba(52,211,153,0.15)', color:'#34d399', border:'1px solid rgba(52,211,153,0.3)', borderRadius:'20px', padding:'4px 12px', fontSize:'0.82rem', fontWeight:600 }}>
                                                    🎉 Promotion Ready
                                                </span>
                                            ) : (gapAnalysis.missingSkills ?? []).map(skill => (
                                                <span key={skill} style={{ background:'rgba(248,113,113,0.12)', color:'#f87171', border:'1px solid rgba(248,113,113,0.25)', borderRadius:'20px', padding:'4px 12px', fontSize:'0.82rem', fontWeight:600 }}>
                                                    ⚠ {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* FULL-WIDTH: Review list + recharts line chart */}
                        {reviews.length > 0 ? (
                            <>
                                {/* Annual review text list */}
                                <div style={{ background:'rgba(255,255,255,0.03)', padding:'28px', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.07)', marginBottom:'28px' }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                                        <h3 style={{ margin:0 }}>Annual Performance Reviews</h3>
                                        {isHR && (
                                            <button className="btn-primary" style={{ padding:'7px 16px', fontSize:'0.78rem' }} onClick={() => setIsAddingReview(true)}>
                                                + Add Review
                                            </button>
                                        )}
                                    </div>
                                    {groupReviewsByYear(reviews).map(({ year, reviews: yr }) => (
                                        <div key={year} style={{ marginBottom:'24px' }}>
                                            <h4 style={{ margin:'0 0 12px', color:'var(--purple-accent)', fontSize:'0.9rem', textTransform:'uppercase', letterSpacing:'1px' }}>{year}</h4>
                                            {yr.map((r, idx) => (
                                                <div key={idx} className="review-item">
                                                    <strong>⭐ {r.score ?? 'N/A'}</strong>&nbsp;—&nbsp;{r.feedback ?? 'No feedback provided.'}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>

                                {/* Full-width recharts performance line chart */}
                                <div style={{ background:'rgba(255,255,255,0.03)', padding:'28px', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.07)' }}>
                                    <h3 style={{ marginTop:0, marginBottom:'24px' }}>Performance Trend</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={getEmployeeChartData(reviews)} margin={{ top:10, right:30, left:0, bottom:10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                                            <XAxis
                                                dataKey="year"
                                                stroke="rgba(255,255,255,0.3)"
                                                tick={{ fill:'rgba(255,255,255,0.5)', fontSize:12 }}
                                            />
                                            <YAxis
                                                domain={[0, 5]}
                                                ticks={[0, 1, 2, 3, 4, 5]}
                                                stroke="rgba(255,255,255,0.3)"
                                                tick={{ fill:'rgba(255,255,255,0.5)', fontSize:12 }}
                                            />
                                            <Tooltip content={<DarkTooltip />} />
                                            <Line
                                                type="monotone"
                                                dataKey="score"
                                                name="Avg. Score"
                                                stroke="#8b5cf6"
                                                strokeWidth={3}
                                                dot={{ r:6, fill:'#8b5cf6', strokeWidth:0 }}
                                                activeDot={{ r:8, fill:'#a78bfa' }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        ) : (
                            <div style={{ background:'rgba(255,255,255,0.03)', padding:'36px', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.07)', textAlign:'center' }}>
                                <p style={{ opacity:0.6, margin:'0 0 20px', fontSize:'1.05rem' }}>
                                    No performance records available for this employee yet.
                                </p>
                                {isHR && (
                                    <button className="btn-primary" onClick={() => setIsAddingReview(true)}>+ Add First Review</button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Employee waiting state */}
                {!selectedEmployee && !isHR && (
                    <div style={{ textAlign:'center', marginTop:'80px', opacity:0.4 }}>
                        <p>Your profile is loading…</p>
                    </div>
                )}

            </div>

            {/* ── Delete Confirmation Modal ── */}
            {isDeleteConfirm && deleteConfirmEmployee && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width:'320px' }}>
                        <h3 style={{ marginTop:0, color:'#f87171' }}>Delete Employee?</h3>
                        <p style={{ color:'var(--text-muted)', marginBottom:'20px' }}>
                            Are you sure you want to permanently delete <strong>{deleteConfirmEmployee.firstName} {deleteConfirmEmployee.lastName}</strong>? This action cannot be undone.
                        </p>
                        <div style={{ display:'flex', gap:'10px' }}>
                            <button style={{ flex:1, background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.4)', color:'#fca5a5', padding:'10px', borderRadius:'6px', cursor:'pointer', fontWeight:'600' }}
                                    onClick={confirmDeleteEmployee} disabled={isCreatingLoading}>
                                {isCreatingLoading ? 'Deleting…' : 'Delete'}
                            </button>
                            <button className="btn-secondary" style={{ flex:1 }}
                                    onClick={() => { setIsDeleteConfirm(false); setDeleteConfirmEmployee(null); }}
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
                    <div className="modal-content" style={{ width:'450px', maxHeight:'90vh', overflowY:'auto' }}>
                        <h3 style={{ marginTop:0 }}>Create New Employee</h3>
                        {createEmployeeError && (
                            <p style={{ color:'#fca5a5', background:'rgba(239,68,68,0.1)', padding:'10px 14px', borderRadius:'6px', fontSize:'0.85rem', border:'1px solid rgba(239,68,68,0.2)', margin:'0 0 18px 0' }}>
                                {createEmployeeError}
                            </p>
                        )}
                        <div style={{ display:'flex', flexDirection:'column', gap:'13px' }}>
                            {[
                                { label:'First Name', key:'firstName', placeholder:'John',            type:'text'     },
                                { label:'Last Name',  key:'lastName',  placeholder:'Doe',             type:'text'     },
                                { label:'Email',      key:'email',     placeholder:'john@acme.com',   type:'email'    },
                                { label:'Password',   key:'password',  placeholder:'••••••••',        type:'password' },
                                { label:'Job Title',  key:'jobTitle',  placeholder:'Senior Engineer', type:'text'     },
                                { label:'Department', key:'department',placeholder:'Engineering',     type:'text'     },
                            ].map(field => (
                                <div key={field.key}>
                                    <label style={{ fontSize:'0.8rem', color:'var(--text-muted)', display:'block', marginBottom:'4px' }}>{field.label}</label>
                                    <input className="form-input" type={field.type} placeholder={field.placeholder}
                                           value={newEmployeeForm[field.key]}
                                           onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, [field.key]: e.target.value })} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize:'0.8rem', color:'var(--text-muted)', display:'block', marginBottom:'4px' }}>Role</label>
                                <select className="form-input" value={newEmployeeForm.role} onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, role: e.target.value })}>
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="HR">HR Administrator</option>
                                </select>
                            </div>
                            <div style={{ display:'flex', gap:'10px', marginTop:'10px' }}>
                                <button className="btn-primary" style={{ flex:1 }} onClick={submitCreateEmployee} disabled={isCreatingLoading}>
                                    {isCreatingLoading ? 'Creating…' : 'Create Employee'}
                                </button>
                                <button className="btn-secondary" style={{ flex:1 }} onClick={closeCreateEmployeeModal} disabled={isCreatingLoading}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Review Modal ── */}
            {isAddingReview && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 style={{ marginTop:0 }}>Performance Audit</h3>
                        <label style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Rating (1–5)</label>
                        <input type="number" min="1" max="5" className="form-input" placeholder="Enter rating on a scale of 1–5"
                               value={newReviewScore} onChange={(e) => setNewReviewScore(e.target.value)} />
                        <label style={{ fontSize:'0.8rem', color:'var(--text-muted)', display:'block', marginTop:'4px' }}>Observation</label>
                        <textarea className="form-input" rows="4" placeholder="Enter your feedback here..."
                                  value={newReviewFeedback} onChange={(e) => setNewReviewFeedback(e.target.value)} />
                        <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
                            <button className="btn-primary" onClick={submitReview}
                                    disabled={isSubmitting || !newReviewScore || !newReviewFeedback.trim()}>
                                {isSubmitting ? 'Saving…' : 'Confirm'}
                            </button>
                            <button className="btn-secondary" onClick={closeReviewModal}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}