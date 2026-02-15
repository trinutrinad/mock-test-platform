import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Exam from './pages/Exam'
import Result from './pages/Result'
import Leaderboard from './pages/Leaderboard'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'

import { useAuth } from './context/AuthContext'
import Loading from './components/Loading'

function App() {
    const { loading } = useAuth()

    if (loading) return <Loading />

    return (
        <BrowserRouter>
            <Navbar />
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/exam/:examId"
                    element={
                        <ProtectedRoute>
                            <Exam />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/result/:attemptId"
                    element={
                        <ProtectedRoute>
                            <Result />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/leaderboard/:examId"
                    element={
                        <ProtectedRoute>
                            <Leaderboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute adminOnly>
                            <Admin />
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>

    )
}

export default App
