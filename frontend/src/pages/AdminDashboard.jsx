import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Printer, Plus, Edit2, Trash2,
  Shield, ShieldOff, X, Filter, Calendar, Eye, IndianRupee, FileText, Ticket, Notebook,
  FileSpreadsheet, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

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

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
};

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';

  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [branchNames, setBranchNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(getTodayIST()); // START DATE
  const [endDateFilter, setEndDateFilter] = useState(getTodayIST()); // END DATE
  const [branchFilter, setBranchFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState(''); // NEW SHIFT FILTER
  const [printMode, setPrintMode] = useState('report'); 

  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [uForm, setUForm] = useState({ username: '', password: '', role: 'Branch', branch_id: '' });
  const [settings, setSettings] = useState([]);
  const [uError, setUError] = useState('');
  const [uLoading, setULoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [dateFilter, endDateFilter, branchFilter, shiftFilter]);

  useEffect(() => {
    if (tab === 'users') {
      fetchUsers();
      fetchAllBranches();
    }
    if (tab === 'settings') {
      fetchSettings();
    }
  }, [tab]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `${API}/reports?`;
      if (dateFilter && endDateFilter) {
        url += `start_date=${dateFilter}&end_date=${endDateFilter}&`;
      } else if (dateFilter) {
        url += `date=${dateFilter}&`;
      }
      const res = await axios.get(url, { headers: auth() });
      const data = Array.isArray(res.data) ? res.data : [];
      let filteredData = data;
      if (branchFilter) filteredData = filteredData.filter(r => r.branch_name === branchFilter);
      if (shiftFilter) filteredData = filteredData.filter(r => r.shift === parseInt(shiftFilter));
      setReports(filteredData);
      const uniq = [...new Set(data.map(r => r.branch_name).filter(Boolean))];
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

  const fetchSettings = async () => {
    try {
      const r = await axios.get(`${API}/reports/settings`, { headers: auth() });
      setSettings(r.data);
    } catch (e) { console.error(e); }
  };

  const updateSetting = async (key, value) => {
    try {
      await axios.post(`${API}/reports/settings`, { key, value }, { headers: auth() });
      fetchSettings();
    } catch (e) { alert('Error updating setting'); }
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
      console.error('Save user error:', e);
      const errorData = e.response?.data?.error || e.response?.data;
      const errorMessage = typeof errorData === 'object' 
        ? (errorData.message || JSON.stringify(errorData)) 
        : (errorData || e.message || 'Error saving user');
      setUError(errorMessage);
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
  const totalUPI   = reports.reduce((a, r) => a + (r.upi_total > 0 ? +r.upi_total : (r.card_total > 0 ? 0 : +r.card_upi_total)), 0);
  const totalCard  = reports.reduce((a, r) => a + (r.card_total > 0 ? +r.card_total : 0), 0);
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
  const allCheques = [];
  reports.forEach(r => {
    // Aggregated Expenses
    const eList = parseJSON(r.expense_desc);
    if (Array.isArray(eList)) {
      eList.forEach(e => allExps.push({ ...e, branch: r.branch_name, date: r.report_date, shift: r.shift }));
    }
    
    // Aggregated Cheques
    if (Array.isArray(r.cheques)) {
      r.cheques.forEach(c => allCheques.push({ ...c, branch: r.branch_name, date: r.report_date, shift: r.shift }));
    }

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

  const handlePrint = (mode, autoSave = false) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      if (autoSave) {
        // Trigger excel export after print dialog is closed
        setTimeout(() => exportToExcel(mode), 1000);
      }
    }, 500);
  };

  const exportToExcel = async (mode) => {
    let data = [];
    let fileName = `Report_${getTodayIST()}.xlsx`;

    if (mode === 'report') {
      fileName = `Daily_Summary_${getTodayIST()}.xlsx`;
      data = reports.map(r => ({
        'Date': formatDate(r.report_date),
        'Branch': r.branch_name,
        'Shift': `S${r.shift}`,
        'Cash': +r.total_cash,
        'Card': r.card_total > 0 ? +r.card_total : (r.upi_total > 0 ? 0 : 0),
        'UPI': r.upi_total > 0 ? +r.upi_total : (r.card_total > 0 ? 0 : +r.card_upi_total),
        'Credit Note': +r.credit_note_total,
        'Sodexo': +r.sodexo_total,
        'Cheques': +r.cheque_total,
        'Expenses': +r.expense,
        'System Total': +r.system_total,
        'Difference': +r.grand_total - +r.system_total,
        'Grand Total': +r.grand_total
      }));
      data.push({ 'Date': 'GRAND TOTAL', 'Cash': totalCash, 'Card': totalCard, 'UPI': totalUPI, 'Credit Note': totalCN, 'Sodexo': totalSod, 'Cheques': totalChq, 'Expenses': totalExp, 'System Total': totalSys, 'Difference': diff, 'Grand Total': totalColl });
    } else if (mode === 'expense') {
      fileName = `Expenses_${getTodayIST()}.xlsx`;
      data = allExps.map(e => ({ 'Date': formatDate(e.date), 'Branch': e.branch, 'Shift': `S${e.shift}`, 'Description': e.desc, 'Amount': +e.amount }));
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    
    // Modern "Save As" logic using File System Access API if available
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Excel Workbook',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
          }],
        });
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const writable = await handle.createWritable();
        await writable.write(buf);
        await writable.close();
      } catch (e) {
        if (e.name !== 'AbortError') XLSX.writeFile(wb, fileName);
      }
    } else {
      XLSX.writeFile(wb, fileName);
    }
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
                  <th>DATE</th><th>BRANCH</th><th>SHIFT</th><th>CASH</th><th>CARD</th><th>UPI</th><th>CN</th><th>SODEXO</th><th>CHQ</th><th>EXPENSE</th><th>SYS TOTAL</th><th>DIFF</th><th style={{ textAlign: 'right' }}>TOTAL</th>
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
                    <td>{formatDate(r.report_date)}</td><td>{r.branch_name}</td><td style={{ textAlign: 'center' }}>S{r.shift}</td>
                    <td>{fmt(r.total_cash)}</td>
                    <td style={{ color: '#6366f1', fontWeight: 600 }}>{r.card_total > 0 ? fmt(r.card_total) : (r.upi_total > 0 ? '0.00' : '-')}</td>
                    <td style={{ color: '#818cf8', fontWeight: 600 }}>{r.upi_total > 0 ? fmt(r.upi_total) : (r.card_total > 0 ? '0.00' : fmt(r.card_upi_total))}</td>
                    <td>{fmt(r.credit_note_total)}</td><td>{fmt(r.sodexo_total)}</td><td>{fmt(r.cheque_total)}</td>
                    <td style={{ color: '#ef4444' }}>{fmt(r.expense)}</td>
                    <td>{fmt(r.system_total)}</td>
                    <td style={{ color: +r.grand_total - +r.system_total >= 0 ? '#10b981' : '#ef4444' }}>{fmt(+r.grand_total - +r.system_total)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(r.grand_total)}</td>

                  </tr>
                ))
              ) : printMode === 'expense' ? (

                allExps.map((e, i) => (
                  <tr key={i}><td>{formatDate(e.date)}</td><td>{e.branch}</td><td>{e.desc}</td><td style={{ textAlign: 'right' }}>{fmt(e.amount)}</td></tr>
                ))
              ) : (
                sortedDenoms.map((d, i) => (
                  <tr key={i}><td>₹ {d.denom}</td><td>{d.qty}</td><td style={{ textAlign: 'right' }}>{fmt(d.total)}</td></tr>
                ))
              )}
              {printMode === 'report' && reports.length > 0 && (
                <tr style={{ fontWeight: 'bold', background: '#eee !important' }}>
                  <td colSpan={3} style={{ textAlign: 'right' }}>GRAND TOTAL:</td>
                  <td>{fmt(totalCash)}</td>
                  <td>{fmt(totalCard)}</td>
                  <td>{fmt(totalUPI)}</td>
                  <td>{fmt(totalCN)}</td>
                  <td>{fmt(totalSod)}</td>
                  <td>{fmt(totalChq)}</td>
                  <td>{fmt(totalExp)}</td>
                  <td>{fmt(totalSys)}</td>
                  <td>{fmt(diff)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(totalColl)}</td>
                </tr>
              )}
            </tbody>
          </table>


          {printMode === 'report' && sortedDenoms.length > 0 && (
            <div style={{ marginTop: '30px', width: '40%' }}>
              {/* Currency Dist */}
              <p style={{ margin: '0 0 8px 0', fontSize: '9pt', fontWeight: 'bold' }}>Currency Distribution (Aggregated)</p>
              <table className="photo-exact-ledger">
                <thead><tr><th>DENOM</th><th>QTY</th><th style={{ textAlign: 'right' }}>TOTAL</th></tr></thead>
                <tbody>
                  {sortedDenoms.map((d, i) => (<tr key={i}><td>₹ {d.denom}</td><td>{d.qty}</td><td style={{ textAlign: 'right' }}>{fmt(d.total)}</td></tr>))}
                  <tr style={{ fontWeight: 'bold' }}><td colSpan={2} style={{ textAlign: 'right' }}>TOTAL:</td><td style={{ textAlign: 'right' }}>{fmt(totalCash)}</td></tr>
                </tbody>
              </table>
            </div>
          )}


        </div>
      </div>

      <div className="glass-card no-print" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* From Date */}
            <div 
              onClick={(e) => { const input = e.currentTarget.querySelector('input'); if(input && input.showPicker) input.showPicker(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 20, border: '1px solid var(--glass-border)', position: 'relative', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>FROM</span>
              <Calendar size={14} style={{ color: 'var(--primary-light)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>
                {formatDate(dateFilter)}
              </span>
              <input 
                type="date" 
                value={dateFilter} 
                onChange={e => setDateFilter(e.target.value)} 
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} 
              />
            </div>

            {/* To Date */}
            <div 
              onClick={(e) => { const input = e.currentTarget.querySelector('input'); if(input && input.showPicker) input.showPicker(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 20, border: '1px solid var(--glass-border)', position: 'relative', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TO</span>
              <Calendar size={14} style={{ color: 'var(--primary-light)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>
                {formatDate(endDateFilter)}
              </span>
              <input 
                type="date" 
                value={endDateFilter} 
                onChange={e => setEndDateFilter(e.target.value)} 
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }} 
              />
            </div>

            {/* Shift Filter */}
            <div style={{ display: 'flex', gap: 6, paddingRight: 12, borderRight: '1px solid var(--glass-border)' }}>
              {['', '1', '2'].map(s => (
                <button key={s || 'all-s'} onClick={() => setShiftFilter(s)} className={shiftFilter === s ? 'btn-primary' : 'btn-ghost'} style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>{s ? `S${s}` : 'All Shifts'}</button>
              ))}
            </div>

            {/* Branch Filter */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['', ...branchNames].map(b => (
                <button key={b || 'all'} onClick={() => setBranchFilter(b)} className={branchFilter === b ? 'btn-primary' : 'btn-ghost'} style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>{b || 'All'}</button>
              ))}
              <button onClick={() => { setDateFilter(''); setEndDateFilter(''); setBranchFilter(''); setShiftFilter(''); }} className="btn-ghost" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}>Clear All</button>
            </div>
          </div>
          <button 
            onClick={() => handlePrint('report', true)} 
            className="btn-primary animate-pulse-glow" 
            style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 25px rgba(99,102,241,0.5)', whiteSpace: 'nowrap' }}
          >
            <Printer size={18} /> Print & Save Summary
          </button>
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
            {allExps.length > 0 ? allExps.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: '0.85rem' }}>{e.desc} ({e.branch} - S{e.shift})</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>₹{fmt(e.amount)}</span>
              </div>
            )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No expenses found</p>}
          </div>

        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b', margin: 0 }}>🏦 Cheque Details</h2>
            <button onClick={() => handlePrint('cheque')} className="btn-ghost" style={{ padding: '4px 8px' }}><Printer size={12} /></button>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {allCheques.length > 0 ? allCheques.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>#{c.cheque_no}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.branch} - S{c.shift}</span>
                </div>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>₹{fmt(c.amount)}</span>
              </div>
            )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No cheques found</p>}
          </div>

        </div>

      </div>

      <style>{`
        .print-template { display: none; }
        @media print {
          @page { size: ${printMode === 'report' ? 'landscape' : 'portrait'} !important; margin: 5mm; }
          * { background: white !important; color: black !important; box-shadow: none !important; -webkit-print-color-adjust: exact; }

          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-template.print-active { display: block !important; width: 100%; }
          .photo-exact-ledger {
            width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; border: 0.5pt solid black;
          }
          .photo-exact-ledger th, .photo-exact-ledger td {
            border: 0.5pt solid black; padding: 4pt 2pt; text-align: left; font-size: ${printMode === 'report' ? '7.5pt' : '9pt'}; color: black;
          }
          .photo-exact-ledger th { font-weight: bold; text-align: center; background: #f0f0f0 !important; }
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

  const SettingsTab = () => (
    <div className="glass-card" style={{ padding: '2rem', maxWidth: 600 }}>
      <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '1.5rem' }}>⚙️ System Settings</h2>
      
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary-light)' }}>📁 Report Backups</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Specify the local folder path on the server where automated text report backups should be saved.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input 
            type="text" 
            placeholder="C:\Reports"
            value={settings.find(s => s.key === 'backup_path')?.value || ''} 
            onChange={(e) => {
              const newSettings = [...settings];
              const idx = newSettings.findIndex(s => s.key === 'backup_path');
              if (idx > -1) newSettings[idx].value = e.target.value;
              else newSettings.push({ key: 'backup_path', value: e.target.value });
              setSettings(newSettings);
            }}
            style={{ ...inputStyle, flex: 1 }} 
          />
          <button 
            className="btn-primary" 
            onClick={() => updateSetting('backup_path', settings.find(s => s.key === 'backup_path')?.value)}
          >
            Save Path
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#ef4444' }}>⚠️ Danger Zone</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Note: Database management tools and data reset options will be available here soon. Use with caution.
        </p>
        <button className="btn-ghost" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }} onClick={() => alert('Feature coming soon')}>
          System Maintenance
        </button>
      </div>
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
        {tab === 'settings' && <SettingsTab key="settings" />}
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
                  {selectedReport.card_total > 0 || selectedReport.upi_total > 0 ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Card Payments</span><span>₹{fmt(selectedReport.card_total)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>UPI Payments</span><span>₹{fmt(selectedReport.upi_total)}</span></div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>UPI / CARD</span><span>₹{fmt(selectedReport.card_upi_total)}</span></div>
                  )}
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
                {uError && (
                  <div style={{ 
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', 
                    borderRadius: 8, padding: '10px', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.5rem' 
                  }}>
                    {uError}
                  </div>
                )}
                <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>Username</label><input type="text" name="username" autoComplete="username" required value={uForm.username} onChange={e => setUForm({ ...uForm, username: e.target.value })} style={inputStyle} /></div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>Password</label>
                  <input 
                    type="password" 
                    name="password"
                    autoComplete="new-password"
                    required={!editUser} 
                    placeholder={editUser ? "Leave blank to keep current password" : "Enter new password"}
                    value={uForm.password} 
                    onChange={e => setUForm({ ...uForm, password: e.target.value })} 
                    style={inputStyle} 
                  />
                </div>

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
