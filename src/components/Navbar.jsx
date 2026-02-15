import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
    const { user, signOut, role } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await signOut()
        navigate('/login')
    }

    return (
        <nav style={styles.nav}>
            <div style={styles.logo}>
                <Link to="/" style={styles.link}>APPSC Mock Test</Link>
            </div>
            <div style={styles.links}>
                {!user ? (
                    <>
                        <Link to="/login" style={styles.link}>Login</Link>
                        <Link to="/register" style={styles.link}>Register</Link>
                    </>
                ) : (
                    <>
                        <Link to="/dashboard" style={styles.link}>Dashboard</Link>
                        {role === 'admin' && <Link to="/admin" style={styles.link}>Admin</Link>}
                        <button onClick={handleLogout} style={styles.button}>Logout</button>
                    </>
                )}
            </div>
        </nav>
    )
}

const styles = {
    nav: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1rem',
        background: '#f8f9fa',
        borderBottom: '1px solid #ddd',
        alignItems: 'center'
    },
    logo: {
        fontWeight: 'bold',
        fontSize: '1.2rem'
    },
    links: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'center'
    },
    link: {
        textDecoration: 'none',
        color: '#333'
    },
    button: {
        padding: '0.5rem 1rem',
        cursor: 'pointer',
        background: '#ff4d4f',
        color: 'white',
        border: 'none',
        borderRadius: '4px'
    }
}
