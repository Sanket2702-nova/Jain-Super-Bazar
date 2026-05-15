import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, ShieldCheck, Clock, FileText,
  TrendingUp, Users, Zap, ChevronRight,
  IndianRupee, Building2, Star, CheckCircle2
} from 'lucide-react';

/* ── tiny animated background blobs ── */
function Blobs() {
  return (
    <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
      <div style={{
        position:'absolute', width:600, height:600,
        borderRadius:'50%', top:'-15%', left:'-10%',
        background:'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        filter:'blur(60px)'
      }} />
      <div style={{
        position:'absolute', width:500, height:500,
        borderRadius:'50%', bottom:'-10%', right:'-8%',
        background:'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
        filter:'blur(60px)'
      }} />
      <div style={{
        position:'absolute', width:400, height:400,
        borderRadius:'50%', top:'40%', left:'50%',
        background:'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
        filter:'blur(80px)'
      }} />
    </div>
  );
}

const features = [
  { icon: <IndianRupee size={22}/>, title:'Cash Denomination Tracking', desc:'Log exact denominations — ₹2000, ₹500 down to ₹10. Real-time cash totals calculated instantly.', color:'#6366f1' },
  { icon: <BarChart3 size={22}/>, title:'Admin Analytics Dashboard', desc:'Company-wide financial overview. Filter by date and branch, export master reports.', color:'#a78bfa' },
  { icon: <FileText size={22}/>, title:'Multi-Shift Reporting', desc:'Separate Shift 1 & Shift 2 reporting with auto-lock after submission to prevent edits.', color:'#10b981' },
  { icon: <ShieldCheck size={22}/>, title:'Secure Role-Based Access', desc:'Admin and Branch roles with JWT authentication. Users can be blocked instantly.', color:'#f59e0b' },
  { icon: <TrendingUp size={22}/>, title:'Real-Time Difference Tracking', desc:'Instantly shows surplus or deficit vs system total. Helps spot discrepancies before end of day.', color:'#ef4444' },
  { icon: <Clock size={22}/>, title:'Daily Auto-Reports', desc:'Reports auto-saved as .txt files with branch, date, shift. Offline-ready fallback download.', color:'#06b6d4' },
];

const stats = [
  { value:'5+', label:'Branches' },
  { value:'2', label:'Shifts / Day' },
  { value:'100%', label:'Secure JWT' },
  { value:'∞', label:'Report History' },
];

const steps = [
  { n:1, title:'Login as Admin or Branch', desc:'Use your unique credentials. Admins see all data; Branch users only see their store.' },
  { n:2, title:'Fill Daily Cash Report', desc:'Enter denominations, digital payments, cheques, expenses, and system total.' },
  { n:3, title:'Submit & Save', desc:'Report is saved to cloud (Supabase) and a .txt file is downloaded to your PC.' },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight:'100vh', position:'relative', background:'var(--bg-base)' }}>
      <Blobs />

      {/* ── Navbar ── */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(8,11,24,0.85)',
        backdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--glass-border)',
        padding:'0 2rem',
        height:'64px',
        display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain' }} />
          <span style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'1.1rem' }}>
            Jain Super Bazar
          </span>
        </div>
        <div style={{ display:'flex', gap:12 }}>
          <button className="btn-ghost" onClick={() => navigate('/login/user')}>Branch Login</button>
          <button className="btn-primary" onClick={() => navigate('/login/admin')}>Admin Login</button>
        </div>
      </nav>

      <div style={{ position:'relative', zIndex:1 }}>

        {/* ── Hero ── */}
        <section style={{ padding:'5rem 2rem 4rem', textAlign:'center', maxWidth:900, margin:'0 auto' }}>
          <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.3)',
              borderRadius:'999px', padding:'0.4rem 1rem',
              fontSize:'0.8rem', color:'#818cf8', fontWeight:600, marginBottom:'1.5rem'
            }}>
              <Zap size={14}/> Daily Cash Reporting Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{opacity:0, y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6, delay:0.1}}
            style={{ fontFamily:'var(--font-heading)', fontSize:'clamp(2.5rem, 6vw, 4.2rem)', fontWeight:800, lineHeight:1.15, marginBottom:'1.5rem' }}
          >
            Smarter Cash Reporting
            <br/>
            <span className="gradient-text">for Every Branch</span>
          </motion.h1>

          <motion.p
            initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.2}}
            style={{ fontSize:'1.15rem', color:'var(--text-secondary)', maxWidth:600, margin:'0 auto 2.5rem', lineHeight:1.7 }}
          >
            A complete daily cash management system for Jain Super Bazar — track denominations,
            digital payments, expenses, and reconcile with system totals in seconds.
          </motion.p>

          <motion.div
            initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.6,delay:0.3}}
            style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}
          >
            <button className="btn-primary" style={{ fontSize:'1rem', padding:'0.85rem 2.2rem' }}
              onClick={() => navigate('/login/admin')}>
              Admin Portal <ChevronRight size={16} style={{display:'inline',marginLeft:4}}/>
            </button>
            <button className="btn-ghost" style={{ fontSize:'1rem', padding:'0.85rem 2.2rem' }}
              onClick={() => navigate('/login/user')}>
              Branch Login
            </button>
          </motion.div>
        </section>

        {/* ── Stats Row ── */}
        <section style={{ padding:'0 2rem 4rem' }}>
          <motion.div
            variants={containerVariants} initial="hidden" whileInView="show" viewport={{once:true}}
            style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, maxWidth:800, margin:'0 auto' }}
          >
            {stats.map(s => (
              <motion.div key={s.label} variants={cardVariants}
                style={{
                  textAlign:'center', padding:'1.5rem 1rem',
                  background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
                  borderRadius:'var(--radius-lg)', backdropFilter:'blur(20px)'
                }}>
                <div style={{ fontFamily:'var(--font-heading)', fontSize:'2.2rem', fontWeight:800, color:'var(--primary-light)' }}>{s.value}</div>
                <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:4, fontWeight:500 }}>{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── Features ── */}
        <section style={{ padding:'2rem 2rem 5rem', maxWidth:1200, margin:'0 auto' }}>
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5}}
            style={{ textAlign:'center', marginBottom:'3rem' }}>
            <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'clamp(1.8rem,4vw,2.5rem)', fontWeight:700, marginBottom:'0.75rem' }}>
              Everything You Need
            </h2>
            <p style={{ color:'var(--text-secondary)', fontSize:'1rem' }}>Built specifically for multi-branch daily cash reconciliation</p>
          </motion.div>

          <motion.div
            variants={containerVariants} initial="hidden" whileInView="show" viewport={{once:true}}
            style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}
          >
            {features.map(f => (
              <motion.div key={f.title} variants={cardVariants} whileHover={{ y:-4, transition:{duration:0.2} }}
                style={{
                  padding:'1.5rem', borderRadius:'var(--radius-lg)',
                  background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
                  backdropFilter:'blur(20px)', cursor:'default'
                }}>
                <div style={{
                  width:48, height:48, borderRadius:12, marginBottom:'1rem',
                  background:`${f.color}20`, border:`1px solid ${f.color}35`,
                  display:'flex', alignItems:'center', justifyContent:'center', color:f.color
                }}>{f.icon}</div>
                <h3 style={{ fontWeight:700, fontSize:'1rem', marginBottom:'0.5rem' }}>{f.title}</h3>
                <p style={{ color:'var(--text-secondary)', fontSize:'0.875rem', lineHeight:1.65 }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── How It Works ── */}
        <section style={{
          padding:'4rem 2rem 5rem',
          background:'linear-gradient(180deg, transparent, rgba(99,102,241,0.05), transparent)'
        }}>
          <div style={{ maxWidth:800, margin:'0 auto' }}>
            <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
              style={{ textAlign:'center', marginBottom:'3rem' }}>
              <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'clamp(1.8rem,4vw,2.5rem)', fontWeight:700 }}>
                How It Works
              </h2>
            </motion.div>
            <motion.div
              variants={containerVariants} initial="hidden" whileInView="show" viewport={{once:true}}
              style={{ display:'flex', flexDirection:'column', gap:16 }}
            >
              {steps.map(s => (
                <motion.div key={s.n} variants={cardVariants}
                  style={{
                    display:'flex', gap:20, padding:'1.5rem',
                    background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
                    borderRadius:'var(--radius-lg)', backdropFilter:'blur(20px)'
                  }}>
                  <div style={{
                    width:44, height:44, borderRadius:'50%', flexShrink:0,
                    background:'linear-gradient(135deg,var(--primary),var(--primary-dark))',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'var(--font-heading)', fontWeight:800, fontSize:'1.1rem',
                    boxShadow:'0 4px 12px rgba(99,102,241,0.4)'
                  }}>{s.n}</div>
                  <div>
                    <h3 style={{ fontWeight:700, fontSize:'1rem', marginBottom:'0.35rem' }}>{s.title}</h3>
                    <p style={{ color:'var(--text-secondary)', fontSize:'0.875rem', lineHeight:1.6 }}>{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Login CTA ── */}
        <section style={{ padding:'3rem 2rem 6rem', maxWidth:900, margin:'0 auto' }}>
          <motion.div
            initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.6}}
            style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20 }}
          >
            {/* Admin Card */}
            <div style={{
              padding:'2.5rem', borderRadius:'var(--radius-xl)',
              background:'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08))',
              border:'1px solid rgba(99,102,241,0.35)', textAlign:'center'
            }}>
              <div style={{
                width:64, height:64, borderRadius:18, margin:'0 auto 1.2rem',
                background:'linear-gradient(135deg,#6366f1,#a78bfa)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 8px 24px rgba(99,102,241,0.4)'
              }}>
                <ShieldCheck size={28} color="#fff"/>
              </div>
              <h3 style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'1.3rem', marginBottom:'0.6rem' }}>Admin Portal</h3>
              <p style={{ color:'var(--text-secondary)', fontSize:'0.875rem', lineHeight:1.65, marginBottom:'1.5rem' }}>
                Access all branch reports, manage users, view financial summaries, and print master reports.
              </p>
              {[
                'View all branches', 'Manage users & access', 'Export & print reports', 'Financial analytics'
              ].map(i => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:'0.85rem' }}>
                  <CheckCircle2 size={15} color="#818cf8" style={{flexShrink:0}}/> {i}
                </div>
              ))}
              <button className="btn-primary" style={{ width:'100%', marginTop:'1.5rem', padding:'0.85rem' }}
                onClick={() => navigate('/login/admin')}>
                Login as Admin
              </button>
            </div>

            {/* Branch Card */}
            <div style={{
              padding:'2.5rem', borderRadius:'var(--radius-xl)',
              background:'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.06))',
              border:'1px solid rgba(16,185,129,0.3)', textAlign:'center'
            }}>
              <div style={{
                width:64, height:64, borderRadius:18, margin:'0 auto 1.2rem',
                background:'linear-gradient(135deg,#10b981,#06b6d4)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 8px 24px rgba(16,185,129,0.35)'
              }}>
                <Building2 size={28} color="#fff"/>
              </div>
              <h3 style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'1.3rem', marginBottom:'0.6rem' }}>Branch Login</h3>
              <p style={{ color:'var(--text-secondary)', fontSize:'0.875rem', lineHeight:1.65, marginBottom:'1.5rem' }}>
                Submit daily cash reports for your branch. Track denominations, payments, and expenses.
              </p>
              {[
                'Cash denomination entry', 'Digital payments logging', 'Expense tracking', 'Auto .txt download'
              ].map(i => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:'0.85rem' }}>
                  <CheckCircle2 size={15} color="#34d399" style={{flexShrink:0}}/> {i}
                </div>
              ))}
              <button className="btn-primary" style={{
                width:'100%', marginTop:'1.5rem', padding:'0.85rem',
                background:'linear-gradient(135deg,#10b981,#059669)',
                boxShadow:'0 4px 15px rgba(16,185,129,0.35)'
              }} onClick={() => navigate('/login/user')}>
                Login as Branch
              </button>
            </div>
          </motion.div>
        </section>

        {/* ── Footer ── */}
        <footer style={{
          borderTop:'1px solid var(--glass-border)',
          padding:'2rem',
          textAlign:'center',
          color:'var(--text-muted)',
          fontSize:'0.82rem'
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:8 }}>
            <img src="/logo.png" alt="Logo" style={{ width: 20, height: 20, objectFit: 'contain' }} />
            <span style={{ fontWeight:700, color:'var(--text-secondary)' }}>Jain Super Bazar</span>
            <span>— Daily Cash Reporting System</span>
          </div>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
