import { Navigate, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
    const { user, role, loading } = useAuth()

    console.log('ProtectedRoute:', {
        email: user?.email,
        role: role,
        expectedRole: adminOnly ? 'admin' : 'any',
        accessGranted: !adminOnly || role === 'admin'
    })

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading access...</div>
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (adminOnly && role !== 'admin') {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                <h2>Access Denied</h2>
                <p>You do not have permission to view this page.</p>
                <Link to="/dashboard" style={{ color: '#2563eb' }}>Return to Dashboard</Link>
            </div>
        )
    }

    return children ? children : <Outlet />
}
