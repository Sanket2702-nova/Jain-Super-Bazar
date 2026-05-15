import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee, LayoutDashboard, Users, Settings,
  LogOut, Menu, X, ChevronRight
} from 'lucide-react';

export default function AppShell({ children, user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin = user?.role === 'Admin';

  // For admin we use ?tab= query param to signal active tab
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'dashboard';

  const adminLinks = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', tab: 'dashboard' },
    { icon: <Users size={18} />, label: 'Users', tab: 'users' },
    { icon: <Settings size={18} />, label: 'Settings', tab: 'settings' },
  ];

  const branchLinks = [
    { icon: <LayoutDashboard size={18} />, label: 'Daily Report', tab: 'branch' },
  ];

  const links = isAdmin ? adminLinks : branchLinks;

  const handleNav = (tab) => {
    if (isAdmin) {
      navigate(`/admin?tab=${tab}`, { replace: false });
    }
    setMobileOpen(false);
  };

  const isActive = (tab) => {
    if (isAdmin) return activeTab === tab;
    return location.pathname === '/branch';
  };

  const handleLogout = () => {
    setLoggingOut(true);
    setTimeout(() => {
      localStorage.clear();
      navigate('/login');
    }, 500);
  };

  // ── Sidebar markup (NOT a nested component to avoid hook issues) ──
  const sidebarJSX = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.25rem 0.5rem 1.5rem' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 11, flexShrink: 0,
          background: 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.2, color: 'var(--text-primary)' }}>
            Jain Super Bazar
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 500 }}>Cash Reporting</div>
        </div>
      </div>

      {/* User badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '0.8rem',
        background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--glass-border)', marginBottom: '1.25rem'
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: isAdmin ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 800,
          color: isAdmin ? '#818cf8' : '#34d399'
        }}>
          {user?.username?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
            {user?.username}
          </div>
          <div style={{ fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.05em', color: isAdmin ? '#818cf8' : '#34d399' }}>
            {isAdmin ? '👑 ADMIN' : `🏪 ${user?.branch_name || 'BRANCH'}`}
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', padding: '0 0.5rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
        Navigation
      </div>

      {/* Nav Links */}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3, flex: 1, padding: 0, margin: 0 }}>
        {links.map(link => {
          const active = isActive(link.tab);
          return (
            <li key={link.tab}
              onClick={() => handleNav(link.tab)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '0.72rem 1rem', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', fontSize: '0.875rem', fontWeight: active ? 700 : 500,
                border: '1px solid', transition: 'all 0.2s ease',
                borderColor: active ? 'rgba(99,102,241,0.3)' : 'transparent',
                background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: active ? 'var(--primary-light)' : 'var(--text-secondary)',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
            >
              {link.icon}
              <span>{link.label}</span>
              {active && <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--primary-light)' }} />}
            </li>
          );
        })}
      </ul>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0.75rem 1rem', width: '100%',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)', color: '#f87171',
          cursor: loggingOut ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { if (!loggingOut) { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; } }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
      >
        <LogOut size={16} /> {loggingOut ? 'Logging out…' : 'Logout'}
      </button>
    </div>
  );

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="app-sidebar no-print">
        {sidebarJSX}
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.aside
              initial={{ x: -270 }} animate={{ x: 0 }} exit={{ x: -270 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 260, height: '100%',
                background: 'var(--bg-1)', borderRight: '1px solid var(--glass-border)',
                padding: '1.5rem 1rem',
              }}
            >
              <button onClick={() => setMobileOpen(false)} style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
              }}>
                <X size={20} />
              </button>
              {sidebarJSX}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <main className="app-main">
        {/* Top bar */}
        <header className="topbar no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="mobile-menu-btn"
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
            >
              <Menu size={22} />
            </button>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {isAdmin
                ? (activeTab === 'users' ? '👥 User Management' : activeTab === 'settings' ? '⚙️ Settings' : '📊 Admin Dashboard')
                : `🏪 ${user?.branch_name || 'Branch'} — Daily Report`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              padding: '0.28rem 0.85rem', borderRadius: 'var(--radius-full)',
              background: isAdmin ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)',
              color: isAdmin ? '#818cf8' : '#34d399',
              fontSize: '0.74rem', fontWeight: 700, border: '1px solid',
              borderColor: isAdmin ? 'rgba(99,102,241,0.3)' : 'rgba(16,185,129,0.3)'
            }}>
              {isAdmin ? '👑 Admin' : '🏪 Branch'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>
          {children}
        </div>
      </main>

      <style>{`
        .mobile-menu-btn { display: none; }
        @media (max-width: 768px) {
          .app-sidebar { display: none !important; }
          .app-main { margin-left: 0 !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media print {
          .no-print { display: none !important; }
          .app-sidebar { display: none !important; }
          .app-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
