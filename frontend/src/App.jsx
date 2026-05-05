import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Login from './pages/Login';
import BranchDashboard from './pages/BranchDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AppShell from './components/AppShell';

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

export default function App() {
  const user = getUser();

  return (
    <Router>
      <Routes>
        {/* Simple Login Page */}
        <Route path="/login" element={
          user
            ? <Navigate to={user.role === 'Admin' ? '/admin' : '/branch'} />
            : <Login />
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        } />

        {/* Branch routes */}
        <Route path="/branch" element={
          <BranchRoute><BranchDashboard /></BranchRoute>
        } />

        {/* Redirect root and all other paths to login or respective dashboard */}
        <Route path="*" element={
          user
            ? <Navigate to={user.role === 'Admin' ? '/admin' : '/branch'} />
            : <Navigate to="/login" />
        } />
      </Routes>
    </Router>
  );
}
