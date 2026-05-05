import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { IndianRupee, Eye, EyeOff, User, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      const { token, user } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Redirect based on role returned from backend
      if (user.role === 'Admin') {
        navigate('/admin');
      } else {
        navigate('/branch');
      }
    } catch (err) {
      console.error('Login error details:', err);
      const errorData = err.response?.data?.error || err.response?.data;
      const errorMessage = typeof errorData === 'object' 
        ? (errorData.message || JSON.stringify(errorData)) 
        : (errorData || err.message || 'Login failed. Please check your credentials.');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position:'fixed', inset:0, pointerEvents:'none',
        background: 'radial-gradient(ellipse 800px 600px at 50% 50%, rgba(99,102,241,0.1) 0%, transparent 70%)',
      }} />

      <div style={{ width:'100%', maxWidth:400, position:'relative', zIndex:1 }}>
        <motion.div
          initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
        >
          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
            <div style={{
              width:64, height:64, borderRadius:18, margin:'0 auto 1.2rem',
              background: 'linear-gradient(135deg,#6366f1,#a78bfa)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
            }}>
              <IndianRupee size={32} color="#fff"/>
            </div>
            <h1 style={{
              fontFamily:'var(--font-heading)', fontWeight:800,
              fontSize:'1.8rem', marginBottom:'0.25rem', color: 'var(--text-primary)'
            }}>Jain Super Bazar</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>Sign in to continue</p>
          </div>

          {/* Login Card */}
          <div className="glass-card" style={{ padding: '2.5rem' }}>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                  style={{
                    background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
                    borderRadius:'var(--radius-md)', padding:'0.75rem 1rem',
                    color:'#f87171', fontSize:'0.85rem', marginBottom:'1.5rem',
                    display:'flex', alignItems:'center', gap:8
                  }}
                >
                  <AlertCircle size={15} style={{flexShrink:0}}/> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
              {/* Username */}
              <div style={{ marginBottom:'1.25rem' }}>
                <label className="form-label">Username</label>
                <div style={{ position:'relative' }}>
                  <User size={18} style={{
                    position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                    color:'var(--text-muted)', pointerEvents:'none'
                  }}/>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft:40 }}
                    placeholder="Enter username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom:'2rem' }}>
                <label className="form-label">Password</label>
                <div style={{ position:'relative' }}>
                  <Lock size={18} style={{
                    position:'absolute', left:12, top:'50%', transform:'translateY(-50%)',
                    color:'var(--text-muted)', pointerEvents:'none'
                  }}/>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingLeft:40, paddingRight:42 }}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{
                      position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer',
                      display:'flex', alignItems:'center', padding:0
                    }}>
                    {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary"
                style={{
                  width:'100%', padding:'0.9rem', fontSize:'1rem',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width:18, height:18, border:'2px solid rgba(255,255,255,0.4)',
                      borderTopColor:'#fff', borderRadius:'50%',
                      animation:'spin 0.8s linear infinite'
                    }}/>
                    Signing in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </div>

          <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem', marginTop:'2rem' }}>
            Jain Super Bazar © {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
