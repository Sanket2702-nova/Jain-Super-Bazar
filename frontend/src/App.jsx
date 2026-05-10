import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Login from './pages/Login';
import BranchDashboard from './pages/BranchDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AppShell from './components/AppShell';
import axios from 'axios';

// Global Axios Interceptor to handle session expiration / invalid tokens
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const isInvalidToken = error.response?.data?.error === 'Invalid token' || 
                          error.response?.data?.error === 'Access denied, no token provided';
    
    if (error.response?.status === 401 || (error.response?.status === 400 && isInvalidToken)) {
      localStorage.clear();
      window.location.href = '/login'; // Force reload to clear all states
    }
    return Promise.reject(error);
  }
);

function getUser() {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) return null;
    return JSON.parse(user);
  } catch {
    return null;
  }
}

function AdminRoute({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'Admin') return <Navigate to="/branch" />;
  return <AppShell user={user}>{children}</AppShell>;
}

function BranchRoute({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'Admin') return <Navigate to="/admin" />;
  return <AppShell user={user}>{children}</AppShell>;
}

function HomeRedirect() {
  const user = getUser();
  if (!user) return <Login />;
  return <Navigate to={user.role === 'Admin' ? '/admin' : '/branch'} />;
}

function LoginRedirect() {
  const user = getUser();
  if (!user) return <Login />;
  return <Navigate to={user.role === 'Admin' ? '/admin' : '/branch'} />;
}

export default function App() {
  React.useEffect(() => {
    const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 Hour
    let timeout;

    const logout = () => {
      if (localStorage.getItem('token')) {
        localStorage.clear();
        window.location.href = '/login';
      }
    };

    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(logout, INACTIVITY_LIMIT);
    };

    // Events to track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    // Only track if logged in
    if (localStorage.getItem('token')) {
      resetTimer();
      events.forEach(evt => window.addEventListener(evt, resetTimer));
    }

    return () => {
      if (timeout) clearTimeout(timeout);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* The Root path NOW renders Login directly if not authenticated */}
        <Route path="/" element={<HomeRedirect />} />

        {/* Support /login path as well */}
        <Route path="/login" element={<LoginRedirect />} />
        
        {/* Support legacy /login/admin /login/user */}
        <Route path="/login/:type" element={<Login />} />

        {/* Admin routes */}
        <Route path="/admin" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        } />

        {/* Branch routes */}
        <Route path="/branch" element={
          <BranchRoute><BranchDashboard /></BranchRoute>
        } />

        {/* Redirect all other paths to root */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
