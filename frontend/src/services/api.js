// src/services/api.js
const IDENTITY_URL = "http://localhost:8081/api/v1/employees";
const PERFORMANCE_URL = "http://localhost:8082/api/v1/reviews";

export const api = {
    // Talks to Port 8081
    getAllEmployees: async () => {
        const res = await fetch(IDENTITY_URL);
        return res.json();
    },

    // Talks to Port 8082
    getReviewsForEmployee: async (employeeId) => {
        const res = await fetch(`${PERFORMANCE_URL}/employee/${employeeId}`);
        return res.json();
    },
    // Add this inside your api object
    getGapAnalysis: async (employeeId) => {
        try {
            const response = await fetch(`http://localhost:8083/api/v1/training/employee/${employeeId}/gap-analysis`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Training Service offline", error);
            return null;
        }
    }
};