// src/pages/DirectoryPage.jsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function DirectoryPage({ onSelectEmployee }) {
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        api.getAllEmployees()
            .then(data => setEmployees(data))
            .catch(err => console.error("Failed to load directory", err));
    }, []);

    return (
        <div>
            <h2 style={{ color: '#333' }}>Global Employee Directory</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>

                {employees.map(emp => (
                    <div key={emp.id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 5px 0' }}>{emp.firstName} {emp.lastName}</h3>
                        <p style={{ margin: '0 0 15px 0', color: '#666' }}>{emp.jobTitle}</p>
                        <button
                            onClick={() => onSelectEmployee(emp)}
                            style={{ padding: '8px 12px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>
                            View Full Profile
                        </button>
                    </div>
                ))}

            </div>
        </div>
    );
}