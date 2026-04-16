// ============================================================
// api.js — Acme Corp HR Portal
// Fixed: correct Performance endpoint, full try/catch on every
// call, array/shape validation so no crash can propagate to React.
// ============================================================

// ============================================================
// DYNAMIC AWS API GATEWAY URLs
// (Injected automatically by ./bin/generate-env.sh during deployment)
// ============================================================

const IDENTITY_URL  = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:8081/api/v1/employees';
const PERFORMANCE_URL = import.meta.env.VITE_PERFORMANCE_API_URL || 'http://localhost:8082/api/v1/reviews';
const TRAINING_URL  = import.meta.env.VITE_TRAINING_API_URL || 'http://localhost:8083/api/v1/training';

export const api = {

    // ── 1. Identity Service (Port 8081) ─────────────────────
    getAllEmployees: async () => {
        try {
            const res = await fetch(IDENTITY_URL);
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('[Identity] getAllEmployees failed:', err);
            return [];
        }
    },

    // ── 2. Performance Service (Port 8082) ──────────────────
    // FIX: was hitting /employee/{id} on the wrong base URL,
    // returning an object (or HTML error page) instead of an array.
    getReviewsForEmployee: async (employeeId) => {
        try {
            const res = await fetch(`${PERFORMANCE_URL}/employee/${employeeId}`);
            if (!res.ok) return [];
            const data = await res.json();
            // Guard: if the service returns an object (error shape etc.) return []
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error(`[Performance] getReviewsForEmployee(${employeeId}) failed:`, err);
            return [];
        }
    },

    // ── 3. Training Service (Port 8083) ─────────────────────
    getGapAnalysis: async (employeeId) => {
        try {
            const res = await fetch(`${TRAINING_URL}/employee/${employeeId}/gap-analysis`);
            if (!res.ok) return null;
            const data = await res.json();
            // Validate shape — must have both array fields or we treat it as null
            if (
                data &&
                Array.isArray(data.acquiredRequiredSkills) &&
                Array.isArray(data.missingSkills)
            ) {
                return data;
            }
            return null;
        } catch (err) {
            console.error(`[Training] getGapAnalysis(${employeeId}) failed:`, err);
            return null;
        }
    },

    getEmployeeTrainingProfile: async (employeeId) => {
        try {
            const res = await fetch(`${TRAINING_URL}/employee/${employeeId}`);
            if (!res.ok) return null;
            return await res.json();
        } catch (err) {
            console.error(`[Training] getEmployeeTrainingProfile(${employeeId}) failed:`, err);
            return null;
        }
    },

    // ── 4. Create Employee (Port 8081) ──────────────────────
    createEmployee: async (employee) => {
        try {
            const res = await fetch(IDENTITY_URL, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(employee),
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to create employee.');
            }
            return await res.json();
        } catch (err) {
            console.error('[Identity] createEmployee failed:', err);
            throw err;
        }
    },

    // ── 5. Delete Employee (Port 8081) ──────────────────────
    deleteEmployee: async (employeeId) => {
        try {
            const res = await fetch(`${IDENTITY_URL}/${employeeId}`, {
                method:  'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to delete employee.');
            }
            return true;
        } catch (err) {
            console.error(`[Identity] deleteEmployee(${employeeId}) failed:`, err);
            throw err;
        }
    },

    // ── 6. Authentication (Port 8081) ────────────────────────
    login: async (email, password, role) => {
        const res = await fetch(`${IDENTITY_URL}/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, requestedRole: role }),
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || 'Authentication failed.');
        }
        return res.json();
    },
};