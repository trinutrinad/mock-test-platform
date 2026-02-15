import { Link } from 'react-router-dom'

export default function NotFound() {
    return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
            <h1 style={{ fontSize: '3rem', color: '#ff4d4f', marginBottom: '1rem' }}>404</h1>
            <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>Page Not Found</p>
            <Link to="/dashboard">
                <button style={{ padding: '0.75rem 1.5rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Go to Dashboard
                </button>
            </Link>
        </div>
    )
}
