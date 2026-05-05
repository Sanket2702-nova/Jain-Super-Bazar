import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Printer, Plus, Edit2, Trash2,
  Shield, ShieldOff, X, Filter, Calendar, Eye, IndianRupee, FileText, Ticket, Notebook
} from 'lucide-react';

const API = '/api';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

// Helper to get Today's Date in IST (YYYY-MM-DD)
const getTodayIST = () => {
  const d = new Date();
  const ist = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + (3600000 * 5.5));
  return ist.toISOString().split('T')[0];
};

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';

  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [branchNames, setBranchNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(getTodayIST()); // DEFAULT TO TODAY
  const [branchFilter, setBranchFilter] = useState('');
  const [printMode, setPrintMode] = useState('report'); 

  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [uForm, setUForm] = useState({ username: '', password: '', role: 'Branch', branch_id: '' });
  const [uError, setUError] = useState('');
  const [uLoading, setULoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [dateFilter, branchFilter]);

  useEffect(() => {
    if (tab === 'users') {
      fetchUsers();
      fetchAllBranches();
    }
  }, [tab]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `${API}/reports?`;
      if (dateFilter) url += `date=${dateFilter}&`;
      const res = await axios.get(url, { headers: auth() });
      let data = res.data;
      if (branchFilter) data = data.filter(r => r.branch_name === branchFilter);
      setReports(data);
      const uniq = [...new Set(res.data.map(r => r.branch_name).filter(Boolean))];
      setBranchNames(uniq);
    } catch (e) {
      console.error('fetchReports', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const r = await axios.get(`${API}/auth/users`, { headers: auth() });
      setUsers(r.data);
    } catch (e) { console.error(e); }
  };

  const fetchAllBranches = async () => {
    try {
      const r = await axios.get(`${API}/auth/branches`, { headers: auth() });
      setAllBranches(r.data);
    } catch (e) { console.error(e); }
  };

  const saveUser = async (e) => {
    e.preventDefault();
    setUError('');
    setULoading(true);
    try {
      if (editUser) {
        await axios.put(`${API}/auth/users/${editUser.id}`, uForm, { headers: auth() });
      } else {
        await axios.post(`${API}/auth/register`, uForm, { headers: auth() });
      }
      setShowModal(false);
      fetchUsers();
    } catch (e) {
      setUError(e.response?.data?.error || 'Error saving user');
    } finally {
      setULoading(false);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await axios.delete(`${API}/auth/users/${id}`, { headers: auth() });
      fetchUsers();
    } catch { alert('Error deleting user'); }
  };

  const toggleBlock = async (u) => {
    try {
      await axios.patch(`${API}/auth/users/${u.id}/block`, { is_blocked: !u.is_blocked }, { headers: auth() });
      fetchUsers();
    } catch { alert('Error'); }
  };

  const openNew = () => {
    setEditUser(null);
    setUForm({ username: '', password: '', role: 'Branch', branch_id: '' });
    setUError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setUForm({ username: u.username, password: '', role: u.role, branch_id: u.branch_id || '' });
    setUError('');
    setShowModal(true);
  };

  const parseJSON = (str) => {
    try { return typeof str === 'string' ? JSON.parse(str) : str; }
    catch { return []; }
  };

  const totalCash  = reports.reduce((a, r) => a + +r.total_cash, 0);
  const totalUPI   = reports.reduce((a, r) => a + +r.card_upi_total, 0);
  const totalCN    = reports.reduce((a, r) => a + +r.credit_note_total, 0); 
  const totalSod   = reports.reduce((a, r) => a + +r.sodexo_total, 0);
  const totalChq   = reports.reduce((a, r) => a + +r.cheque_total, 0);
  const totalExp   = reports.reduce((a, r) => a + +r.expense, 0);
  const totalColl  = reports.reduce((a, r) => a + +r.grand_total, 0);
  const totalSys   = reports.reduce((a, r) => a + +r.system_total, 0);
  const diff       = totalColl - totalSys;

  const aggDenoms = {};
  reports.forEach(r => {
    const dList = parseJSON(r.denominations);
    dList.forEach(d => {
      if (!aggDenoms[d.denomination]) aggDenoms[d.denomination] = { qty: 0, total: 0 };
      aggDenoms[d.denomination].qty += +d.quantity;
      aggDenoms[d.denomination].total += +d.total;
    });
  });
  const sortedDenoms = Object.entries(aggDenoms).sort((a,b) => b[0] - a[0]).map(([denom, val]) => ({ denom, ...val }));

  const allExps = [];
  reports.forEach(r => {
    const eList = parseJSON(r.expense_desc);
    eList.forEach(e => allExps.push({ ...e, branch: r.branch_name, date: r.report_date }));
  });

  const statCards = [
    { label: 'Cash',            value: totalCash, color: '#10b981', icon: '💵' },
    { label: 'UPI / Card',      value: totalUPI,  color: '#6366f1', icon: '📱' },
    { label: 'Credit Note',     value: totalCN,   color: '#8b5cf6', icon: '📝' },
    { label: 'Sodexo',          value: totalSod,  color: '#ec4899', icon: '🎫' },
    { label: 'Cheques',         value: totalChq,  color: '#f59e0b', icon: '🏦' },
    { label: 'Expenses',        value: totalExp,  color: '#ef4444', icon: '📑' },
    { label: 'Total Collection',value: totalColl, color: '#818cf8', icon: '💰' },
    { label: 'System Total',    value: totalSys,  color: '#94a3b8', icon: '🖥️' },
    { label: 'Difference',      value: diff,      color: diff >= 0 ? '#10b981' : '#ef4444', icon: diff >= 0 ? '📈' : '📉', signed: true },
  ];

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => window.print(), 200);
  };

  const DashboardTab = () => (
    <>
      <div className={`print-template print-active`}>
        <div style={{ padding: '30px', background: 'white', color: 'black' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '9pt', color: '#000', textAlign: 'left' }}>
            {printMode === 'report' ? 'Daily Collection Summary Sheet' : printMode === 'expense' ? 'Detailed Expenses Sheet' : 'Currency Distribution Sheet'}
          </p>
          <table className="photo-exact-ledger">
            <thead>
              {printMode === 'report' ? (
                <tr>
                  <th>DATE</th><th>BRANCH</th><th>SHIFT</th><th>CASH</th><th>UPI/CARD</th><th>CREDIT NOTE</th><th>SODEXO</th><th>CHQ</th><th>DIFF</th><th style={{ textAlign: 'right' }}>TOTAL</th>
                </tr>
              ) : printMode === 'expense' ? (
                <tr><th>DATE</th><th>BRANCH</th><th>DESCRIPTION</th><th style={{ textAlign: 'right' }}>AMOUNT</th></tr>
              ) : (
                <tr><th>DENOMINATION</th><th>QUANTITY</th><th style={{ textAlign: 'right' }}>TOTAL</th></tr>
              )}
            </thead>
            <tbody>
              {printMode === 'report' ? (
                reports.map((r, i) => (
                  <tr key={i}>
                    <td>{r.report_date}</td><td>{r.branch_name}</td><td style={{ textAlign: 'center' }}>S{r.shift}</td>
                    <td>{fmt(r.total_cash)}</td><td>{fmt(r.card_upi_total)}</td><td>{fmt(r.credit_note_total)}</td><td>{fmt(r.sodexo_total)}</td><td>{fmt(r.cheque_total)}</td>
                    <td>{fmt(+r.grand_total - +r.system_total)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(r.grand_total)}</td>
                  </tr>
                ))
              ) : printMode === 'expense' ? (
                allExps.map((e, i) => (
                  <tr key={i}><td>{e.date}</td><td>{e.branch}</td><td>{e.desc}</td><td style={{ textAlign: 'right' }}>{fmt(e.amount)}</td></tr>
                ))
              ) : (
                sortedDenoms.map((d, i) => (
                  <tr key={i}><td>₹ {d.denom}</td><td>{d.qty}</td><td style={{ textAlign: 'right' }}>{fmt(d.total)}</td></tr>
                ))
              )}
            </tbody>
          </table>
          {printMode === 'report' && sortedDenoms.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '9pt', fontWeight: 'bold' }}>Currency Distribution (Aggregated)</p>
              <table className="photo-exact-ledger" style={{ width: '40%' }}>
                <thead><tr><th>DENOM</th><th>QTY</th><th style={{ textAlign: 'right' }}>TOTAL</th></tr></thead>
                <tbody>
                  {sortedDenoms.map((d, i) => (<tr key={i}><td>₹ {d.denom}</td><td>{d.qty}</td><td style={{ textAlign: 'right' }}>{fmt(d.total)}</td></tr>))}
                  <tr style={{ fontWeight: 'bold' }}><td colSpan={2} style={{ textAlign: 'right' }}>TOTAL CASH:</td><td style={{ textAlign: 'right' }}>₹ {fmt(totalCash)}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card no-print" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '0.45rem', color: 'white' }} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['', ...branchNames].map(b => (
                <button key={b || 'all'} onClick={() => setBranchFilter(b)} className={branchFilter === b ? 'btn-primary' : 'btn-ghost'} style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>{b || 'All'}</button>
              ))}
              <button onClick={() => setDateFilter('')} className="btn-ghost" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>Clear Date</button>
            </div>
          </div>
          <button onClick={() => handlePrint('report')} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}><Printer size={15} style={{ marginRight: 6 }} /> Print Summary</button>
        </div>
      </div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {statCards.map(s => (
          <motion.div initial="hidden" animate="show" variants={fadeUp} key={s.label} className="stat-card">
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{s.icon} {s.label}</p>
            <h4 style={{ color: s.color, margin: '5px 0 0 0', fontSize: '0.95rem' }}>₹ {fmt(s.value)}</h4>
          </motion.div>
        ))}
      </div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
             <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981', margin: 0 }}>💵 Cash Inventory</h2>
             <button onClick={() => handlePrint('inventory')} className="btn-ghost" style={{ padding: '4px 8px' }}><Printer size={12} /></button>
          </div>
          {sortedDenoms.map(d => (<div key={d.denom} className="denom-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>₹{d.denom} × {d.qty}</span><span>₹{fmt(d.total)}</span></div>))}
          <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: 10, paddingTop: 10, fontWeight: 800 }}>Total: ₹{fmt(totalCash)}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444', margin: 0 }}>📑 Expenses</h2>
            <button onClick={() => handlePrint('expense')} className="btn-ghost" style={{ padding: '4px 8px' }}><Printer size={12} /></button>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {allExps.map((e, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>{e.desc}</span><span style={{ color: '#ef4444' }}>₹{fmt(e.amount)}</span></div>))}
          </div>
        </div>
      </div>

      <style>{`
        .print-template { display: none; }
        @media print {
          @page { size: portrait; margin: 0; }
          * { background: white !important; color: black !important; box-shadow: none !important; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-template.print-active { display: block !important; width: 100%; }
          .photo-exact-ledger {
            width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; border: 0.5pt solid black;
          }
          .photo-exact-ledger th, .photo-exact-ledger td {
            border: 0.5pt solid black; padding: 5pt 3pt; text-align: left; font-size: 7pt; color: black;
          }
          .photo-exact-ledger th { font-weight: bold; text-align: center; background: white !important; }
        }
      `}</style>
    </>
  );

  const UsersTab = () => (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>👥 System Users</h2>
        <button className="btn-primary" onClick={openNew}><Plus size={15} style={{ marginRight: 5 }} /> New User</button>
      </div>
      <table className="premium-table">
        <thead><tr><th>Username</th><th>Role</th><th>Branch</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td><span className={`badge ${u.role === 'Admin' ? 'badge-primary' : 'badge-info'}`}>{u.role}</span></td>
              <td>{u.branch_name || '—'}</td>
              <td><span className={`badge ${u.is_blocked ? 'badge-danger' : 'badge-success'}`}>{u.is_blocked ? 'Blocked' : 'Active'}</span></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => toggleBlock(u)} className="btn-ghost" style={{ fontSize: '0.7rem' }}>{u.is_blocked ? 'Unblock' : 'Block'}</button>
                  <button onClick={() => openEdit(u)} className="btn-ghost" style={{ fontSize: '0.7rem' }}>Edit</button>
                  <button onClick={() => deleteUser(u.id)} className="btn-ghost" style={{ fontSize: '0.7rem', color: '#ef4444' }}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '1.5rem' }} className="no-print">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{tab === 'users' ? '👥 Users' : '📊 Dashboard'}</h1>
      </div>
      <AnimatePresence mode="wait">
        {tab === 'dashboard' && <DashboardTab key="dashboard" />}
        {tab === 'users' && <UsersTab key="users" />}
      </AnimatePresence>
      <AnimatePresence>
        {selectedReport && (
          <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
            <motion.div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h2>Report Details</h2><button onClick={() => setSelectedReport(null)} className="btn-ghost"><X size={20} /></button></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div><h3 style={{ color: '#10b981' }}>Denominations</h3>{parseJSON(selectedReport.denominations).map((d, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}><span>₹{d.denomination} x {d.quantity}</span><span>₹{fmt(d.total)}</span></div>))}</div>
                <div>
                  <h3 style={{ color: '#6366f1' }}>Payment Breakdown</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>UPI / CARD</span><span>₹{fmt(selectedReport.card_upi_total)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Credit Note</span><span>₹{fmt(selectedReport.credit_note_total)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sodexo</span><span>₹{fmt(selectedReport.sodexo_total)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cheque</span><span>₹{fmt(selectedReport.cheque_total)}</span></div>
                  <h3 style={{ color: '#ef4444', marginTop: 15 }}>Expenses</h3>{parseJSON(selectedReport.expense_desc).map((e, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{e.desc}</span><span>₹{fmt(e.amount)}</span></div>))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <motion.div className="modal-box" onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontWeight: 800 }}>{editUser ? 'Edit User' : 'New User'}</h2>
                <button onClick={() => setShowModal(false)} className="btn-ghost"><X size={20} /></button>
              </div>
              <form onSubmit={saveUser}>
                <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>Username</label><input type="text" required value={uForm.username} onChange={e => setUForm({ ...uForm, username: e.target.value })} style={inputStyle} /></div>
                <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>Password</label><input type="password" required={!editUser} value={uForm.password} onChange={e => setUForm({ ...uForm, password: e.target.value })} style={inputStyle} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.5rem' }}>
                  <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>Role</label><select value={uForm.role} className="form-select" style={inputStyle} onChange={e => setUForm({ ...uForm, role: e.target.value })}><option value="Branch">Branch</option><option value="Admin">Admin</option></select></div>
                  <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>Branch</label><select value={uForm.branch_id} disabled={uForm.role === 'Admin'} className="form-select" style={{ ...inputStyle, opacity: uForm.role === 'Admin' ? 0.5 : 1 }} onChange={e => setUForm({ ...uForm, branch_id: e.target.value })}><option value="">None</option>{allBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={uLoading}>Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: 8, padding: '10px', color: 'white' };
