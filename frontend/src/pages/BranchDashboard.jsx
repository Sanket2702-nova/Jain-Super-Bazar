import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Upload, CheckCircle, AlertCircle, Clock, IndianRupee, Calendar } from 'lucide-react';

const API = '/api';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const DENOMS = [2000, 500, 200, 100, 50, 20, 10];
const DENOM_COLORS = { 2000:'#ef4444', 500:'#6366f1', 200:'#f59e0b', 100:'#10b981', 50:'#06b6d4', 20:'#a78bfa', 10:'#f472b6' };

const IST_DATE = () => {
  const d = new Date();
  const ist = new Date(d.getTime() + (d.getTimezoneOffset()*60000) + (3600000*5.5));
  return ist.toISOString().split('T')[0];
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
};

export default function BranchDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [date, setDate] = useState(IST_DATE());
  const [shift, setShift] = useState(1);
  const [submittedShifts, setSubmittedShifts] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState(null); // {type:'success'|'error', text}
   const [modal, setModal] = useState(null); // {type:'error'|'success', title, text}
   const [showConfirm, setShowConfirm] = useState(false); // NEW CONFIRMATION STATE


  const [denoms, setDenoms] = useState(DENOMS.map(d => ({ denomination:d, quantity:0, total:0 })));
  const [systemTotal, setSystemTotal] = useState('');
  const [cardUpi, setCardUpi] = useState('');
  const [sodexo, setSodexo] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [cardProof, setCardProof] = useState(null);
  const [upiTotal, setUpiTotal] = useState('');
  const [cardTotal, setCardTotal] = useState('');
  const [expenses, setExpenses] = useState([{ amount:'', desc:'', proof:null }]);
  const [cheques, setCheques] = useState([{ cheque_no:'', amount:'', cheque_date:'' }]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/reports?date=${date}`, { headers:headers() });
        const reports = Array.isArray(res.data) ? res.data : [];
        const done = reports.map(r => r.shift);
        setSubmittedShifts(done);

        if (done.includes(shift)) setIsLocked(true);
        else {
          setIsLocked(false);
          if (done.includes(1) && !done.includes(2)) setShift(2);
        }
      } catch(e) { console.error(e); }
    })();
  }, [date, shift]);

  const totalCash = denoms.reduce((a,d) => a+d.total, 0);
  const totalExp  = expenses.reduce((a,e) => a+parseFloat(e.amount||0), 0);
  const totalChq  = cheques.reduce((a,c) => a+parseFloat(c.amount||0), 0);
  const grandTotal = totalCash + parseFloat(cardUpi||0) + parseFloat(sodexo||0) + parseFloat(creditNote||0) + totalExp + totalChq;
  const sysNum = parseFloat(systemTotal||0);
  const diff = grandTotal - sysNum;

  const handleDenom = (idx, qty) => {
    const nd = [...denoms];
    nd[idx].quantity = parseInt(qty)||0;
    nd[idx].total = nd[idx].quantity * nd[idx].denomination;
    setDenoms(nd);
  };

  const resetForm = () => {
    setDenoms(DENOMS.map(d => ({denomination:d,quantity:0,total:0})));
    setSystemTotal(''); setCardUpi(''); setSodexo(''); setCreditNote(''); setBillAmount('');
    setUpiTotal(''); setCardTotal('');
    setCardProof(null); setExpenses([{amount:'',desc:'',proof:null}]);
    setCheques([{cheque_no:'',amount:'',cheque_date:''}]);
  };

  const downloadTxt = async () => {
    const lines = [
      '     JAIN SUPER BAZAR',`     DAILY CASH REPORT`,`========================================`,
      `Branch   : ${user.branch_name}`,`Date     : ${formatDate(date)} (Shift ${shift})`,
      `----------------------------------------`,`CASH DENOMINATIONS`,
      ...denoms.filter(d=>d.quantity>0).map(d=>`  ₹${d.denomination} x ${d.quantity} = ₹${d.total}`),
      `  Total Cash         : ₹ ${totalCash.toFixed(2)}`,`----------------------------------------`,
      `DIGITAL PAYMENTS`,
      `  Card & UPI         : ₹ ${parseFloat(cardUpi||0).toFixed(2)}`,
      `  Sodexo             : ₹ ${parseFloat(sodexo||0).toFixed(2)}`,
      `  Credit Note        : ₹ ${parseFloat(creditNote||0).toFixed(2)}`,
      `  System Total       : ₹ ${sysNum.toFixed(2)}`,`----------------------------------------`,
      `CHEQUES`,
      ...( cheques.filter(c=>c.amount>0).length>0
        ? cheques.filter(c=>c.amount>0).map((c,i)=>`  ${i+1}. No:${c.cheque_no} ₹${parseFloat(c.amount).toFixed(2)} ${c.cheque_date}`)
        : [`  No cheques`]),
      `  Total Cheques      : ₹ ${totalChq.toFixed(2)}`,`----------------------------------------`,
      `EXPENSES`,
      ...( expenses.filter(e=>parseFloat(e.amount)>0).length>0
        ? expenses.filter(e=>e.amount>0).map((e,i)=>`  ${i+1}. ₹${parseFloat(e.amount).toFixed(2)} - ${e.desc||''}`)
        : [`  No expenses`]),
      `  Total Expenses     : ₹ ${totalExp.toFixed(2)}`,`========================================`,
      `  GRAND TOTAL        : ₹ ${grandTotal.toFixed(2)}`,`========================================`,
      `Submitted at: ${new Date().toLocaleString()}`,
    ];
    const content = lines.join('\n');
    const fname = `${(user.branch_name||'branch').toLowerCase().replace(/\s+/g,'_')}_s${shift}_${formatDate(date)}.txt`;
    if ('showSaveFilePicker' in window) {
      try {
        const h = await window.showSaveFilePicker({ suggestedName:fname, types:[{description:'Text',accept:{'text/plain':['.txt']}}] });
        const w = await h.createWritable(); await w.write(content); await w.close(); return;
      } catch {}
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content],{type:'text/plain'}));
    a.download = fname; a.click();
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!systemTotal) { setMessage({type:'error',text:'System Total is required!'}); return; }
    
    // Validate Cheques
    const incompleteCheque = cheques.find(c => (c.amount && !c.cheque_no) || (!c.amount && c.cheque_no));
    if (incompleteCheque) {
      setModal({
        type: 'error',
        title: 'Incomplete Cheque Data',
        text: '⚠️ Both Cheque Number and Amount are required for any cheque entry you add.'
      });
      return;
    }
    setShowConfirm(true);
  };

  const processSubmit = async () => {
    setShowConfirm(false);
    setLoading(true); setMessage(null);
    const fd = new FormData();
    fd.append('branch_id', user.branch_id);
    fd.append('report_date', date);
    fd.append('shift', shift);
    fd.append('system_total', systemTotal);
    fd.append('card_upi_total', cardUpi||0);
    fd.append('sodexo_total', sodexo||0);
    fd.append('credit_note_total', creditNote||0);
    if (user.username?.toLowerCase()==='slave4') {
      fd.append('bill_amount', billAmount||0);
    }
    const validExp = expenses.filter(e=>parseFloat(e.amount)>0);
    fd.append('expense', totalExp);
    fd.append('expense_desc', JSON.stringify(validExp.map(e=>({amount:e.amount,desc:e.desc}))));
    validExp.forEach((e,i) => { if(e.proof) fd.append(`expense_proof_${i}`, e.proof); });
    fd.append('denominations', JSON.stringify(denoms.filter(d=>d.quantity>0)));
    fd.append('cheques', JSON.stringify(cheques.filter(c=>c.cheque_no&&c.amount)));
    if (cardProof) fd.append('card_upi_proof', cardProof);
    try {
      await axios.post(`${API}/reports`, fd, { headers:{...headers(),'Content-Type':'multipart/form-data'} });
      await downloadTxt();
      setMessage({type:'success', text:`✅ Shift ${shift} report submitted & saved!`});
      setSubmittedShifts(p => [...p, shift]);
      if (shift===1) { setShift(2); resetForm(); setIsLocked(false); }
      else setIsLocked(true);
    } catch(err) {
      console.error('Submit report error:', err);
      const errorData = err.response?.data?.error || err.response?.data;
      const errorMessage = typeof errorData === 'object' 
        ? (errorData.message || JSON.stringify(errorData)) 
        : (errorData || err.message || 'Error submitting report');
      setMessage({type:'error', text: 'Error: ' + errorMessage});
    } finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom:'1.5rem', display: 'flex', alignItems: 'center', gap: 15 }}>
        <img src="/logo.png" alt="Logo" style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 10 }} />
        <div>
          <h1 style={{ fontFamily:'var(--font-heading)', fontWeight:800, fontSize:'1.5rem', marginBottom:0 }}>
            {user.branch_name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Daily Cash Report</p>
        </div>
      </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div 
            onClick={(e) => { const input = e.currentTarget.querySelector('input'); if(input && input.showPicker) input.showPicker(); }}
            style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.05)', padding:'4px 12px', borderRadius:20, border:'1px solid var(--glass-border)', cursor:'pointer', position:'relative' }}
          >
            <Calendar size={14} style={{ color:'var(--primary-light)' }}/>
            <span style={{ fontSize:'0.85rem', fontWeight:700, color:'white', letterSpacing:'0.02em' }}>
              {formatDate(date)}
            </span>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => { setDate(e.target.value); setShift(1); setMessage(null); }}
              style={{ position:'absolute', opacity:0, width:0, height:0, pointerEvents:'none' }} 
            />
            <span style={{ color:'var(--text-secondary)', fontSize:'0.8rem', opacity:0.8 }}>
              ({new Date(date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short'})})
            </span>
          </div>
          {/* Shift selector */}
          <div style={{ display:'flex', gap:6 }}>
            {[1,2].map(s => (
              <button key={s}
                onClick={() => { setShift(s); setMessage(null); }}
                disabled={s===2 && !submittedShifts.includes(1)}
                style={{
                  padding:'0.35rem 1rem', borderRadius:'var(--radius-full)', border:'1px solid',
                  borderColor: shift===s ? 'var(--primary)' : 'var(--glass-border)',
                  background: shift===s ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: shift===s ? 'var(--primary-light)' : 'var(--text-secondary)',
                  cursor: (s===2&&!submittedShifts.includes(1)) ? 'not-allowed' : 'pointer',
                  fontWeight:700, fontSize:'0.82rem', opacity:(s===2&&!submittedShifts.includes(1))?0.5:1,
                  transition:'all 0.2s', display:'flex', alignItems:'center', gap:5
                }}>
                Shift {s} {submittedShifts.includes(s) && <CheckCircle size={13} color="#34d399"/>}
              </button>
            ))}
        </div>
      </div>

      {/* Alert */}
      <AnimatePresence>
        {message && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className={`alert alert-${message.type==='success'?'success':'danger'}`}
            style={{ marginBottom:'1rem', display:'flex', alignItems:'center', gap:8 }}>
            {message.type==='success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {isLocked ? (
        <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} className="glass-card"
          style={{ textAlign:'center', padding:'4rem 2rem' }}>
          <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>✅</div>
          <h2 style={{ fontFamily:'var(--font-heading)', fontWeight:800, color:'#34d399', fontSize:'1.5rem', marginBottom:'0.5rem' }}>
            {submittedShifts.length === 2 ? 'All Done for Today!' : `Shift ${shift} Submitted!`}
          </h2>
          <p style={{ color:'var(--text-secondary)' }}>
            {submittedShifts.length === 2 
              ? `Both Shift 1 and Shift 2 have been submitted for ${formatDate(date)}.` 
              : `Shift ${shift} report for ${formatDate(date)} is already on file. You can switch to the next shift above.`}
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:20 }}>

            {/* ── Cash Denominations ── */}
            <div className="glass-card">
              <h2 style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'1.05rem', marginBottom:'1.25rem' }}>
                💵 Cash Denominations
              </h2>
              {denoms.map((d,i) => (
                <div key={d.denomination} className="denom-row">
                  <span className="denom-label" style={{ color: DENOM_COLORS[d.denomination] }}>₹ {d.denomination}</span>
                  <input type="number" min="0" className="form-input" style={{ padding:'0.5rem 0.75rem' }}
                    placeholder="0" value={d.quantity||''}
                    onWheel={e=>e.target.blur()}
                    onChange={e=>handleDenom(i,e.target.value)} />
                  <span className="denom-total">₹ {d.total.toLocaleString()}</span>
                </div>
              ))}
              <div style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid var(--glass-border)'
              }}>
                <span style={{ fontWeight:700, fontSize:'0.9rem' }}>Total Cash</span>
                <span style={{ fontFamily:'var(--font-heading)', fontWeight:800, fontSize:'1.3rem', color:'#34d399' }}>
                  ₹ {totalCash.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* ── Digital & System ── */}
            <div className="glass-card" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <h2 style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'1.05rem', marginBottom:'0.25rem' }}>
                💳 Digital & System
              </h2>

              {user.username?.toLowerCase()==='slave4' && (
                <div>
                  <label className="form-label" style={{ color:'#fbbf24' }}>Total Bill Amount ⚠️ (Required)</label>
                  <input type="number" step="0.01" className="form-input" placeholder="₹ 0.00"
                    value={billAmount} onWheel={e=>e.target.blur()}
                    style={{ borderColor:'rgba(245,158,11,0.6)' }}
                    onChange={e=>setBillAmount(e.target.value)} required />
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'end' }}>
                <div>
                  <label className="form-label">Card & UPI Payments</label>
                  <input type="number" step="0.01" className="form-input" placeholder="₹ 0.00"
                    value={cardUpi} onWheel={e=>e.target.blur()} onChange={e=>setCardUpi(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Proof</label>
                  <label style={{
                    display:'flex', alignItems:'center', gap:6, padding:'0.65rem 0.85rem',
                    background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)',
                    borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'0.8rem', color:'var(--text-secondary)',
                    whiteSpace:'nowrap'
                  }}>
                    <Upload size={14}/> {cardProof ? cardProof.name.slice(0,10)+'…' : 'Upload'}
                    <input type="file" style={{display:'none'}} onChange={e=>setCardProof(e.target.files[0])} />
                  </label>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label className="form-label">Sodexo Total</label>
                  <input type="number" step="0.01" className="form-input" placeholder="₹ 0.00"
                    value={sodexo} onWheel={e=>e.target.blur()} onChange={e=>setSodexo(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Credit Note (Refunds)</label>
                  <input type="number" step="0.01" className="form-input" placeholder="₹ 0.00"
                    value={creditNote} onWheel={e=>e.target.blur()} onChange={e=>setCreditNote(e.target.value)} />
                </div>
              </div>

              {/* Cheques */}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.6rem' }}>
                  <label className="form-label" style={{ margin:0 }}>Cheques</label>
                  <button type="button" onClick={() => setCheques(p=>[...p,{cheque_no:'',amount:'',cheque_date:''}])}
                    style={{ background:'none', border:'1px solid rgba(245,158,11,0.4)', borderRadius:'var(--radius-full)',
                      color:'#fbbf24', cursor:'pointer', fontSize:'0.75rem', padding:'0.25rem 0.7rem', fontWeight:600 }}>
                    <Plus size={12} style={{display:'inline'}}/> Add
                  </button>
                </div>
                {cheques.map((c,i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1.5fr auto', gap:6, marginBottom:6 }}>
                    <input type="text" className="form-input" placeholder="Cheque No" style={{padding:'0.5rem 0.6rem',fontSize:'0.82rem'}}
                      value={c.cheque_no} onChange={e=>{const n=[...cheques];n[i].cheque_no=e.target.value;setCheques(n);}} />
                    <input type="number" step="0.01" className="form-input" placeholder="₹" style={{padding:'0.5rem 0.6rem',fontSize:'0.82rem'}}
                      value={c.amount} onWheel={e=>e.target.blur()} onChange={e=>{const n=[...cheques];n[i].amount=e.target.value;setCheques(n);}} />
                    <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', borderRadius:6, padding:'0 6px' }}>
                      <Calendar size={12} style={{ color:'var(--text-muted)' }} />
                      <input type="date" className="form-input" style={{ background:'none', border:'none', padding:'0.5rem 0', fontSize:'0.78rem', width:'100%' }}
                        value={c.cheque_date} onChange={e=>{const n=[...cheques];n[i].cheque_date=e.target.value;setCheques(n);}} />
                    </div>
                    {cheques.length>1 && (
                      <button type="button" onClick={()=>setCheques(p=>p.filter((_,j)=>j!==i))}
                        style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:6,color:'#f87171',cursor:'pointer',padding:'0 8px'}}>
                        <X size={13}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Expenses */}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.6rem' }}>
                  <label className="form-label" style={{ margin:0 }}>Expenses</label>
                  <button type="button" onClick={() => setExpenses(p=>[...p,{amount:'',desc:'',proof:null}])}
                    style={{ background:'none', border:'1px solid rgba(99,102,241,0.4)', borderRadius:'var(--radius-full)',
                      color:'#818cf8', cursor:'pointer', fontSize:'0.75rem', padding:'0.25rem 0.7rem', fontWeight:600 }}>
                    <Plus size={12} style={{display:'inline'}}/> Add
                  </button>
                </div>
                {expenses.map((ex,i) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'1.2fr 2fr 1fr auto', gap:6, marginBottom:6 }}>
                    <input type="number" step="0.01" className="form-input" placeholder="₹" style={{padding:'0.5rem 0.6rem',fontSize:'0.82rem'}}
                      value={ex.amount} onWheel={e=>e.target.blur()} onChange={e=>{const n=[...expenses];n[i].amount=e.target.value;setExpenses(n);}} />
                    <input type="text" className="form-input" placeholder="Description" style={{padding:'0.5rem 0.6rem',fontSize:'0.82rem'}}
                      value={ex.desc} onChange={e=>{const n=[...expenses];n[i].desc=e.target.value;setExpenses(n);}} />
                    <label style={{
                      display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'0.5rem',
                      background:'rgba(255,255,255,0.04)',border:'1px solid var(--glass-border)',
                      borderRadius:6,cursor:'pointer',fontSize:'0.75rem',color:'var(--text-muted)'
                    }}>
                      <Upload size={12}/>{ex.proof?'✓':'Bill'}
                      <input type="file" style={{display:'none'}} onChange={e=>{const n=[...expenses];n[i].proof=e.target.files[0];setExpenses(n);}} />
                    </label>
                    {expenses.length>1 && (
                      <button type="button" onClick={()=>setExpenses(p=>p.filter((_,j)=>j!==i))}
                        style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:6,color:'#f87171',cursor:'pointer',padding:'0 8px'}}>
                        <X size={13}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* System Total */}
              <div>
                <label className="form-label" style={{ color:'#fbbf24' }}>⚠️ System Total (Software) — Required</label>
                <input type="number" step="0.01" className="form-input" placeholder="₹ 0.00"
                  value={systemTotal} required onWheel={e=>e.target.blur()} onChange={e=>setSystemTotal(e.target.value)}
                  style={{ borderColor:'rgba(245,158,11,0.7)', fontSize:'1.1rem', fontWeight:700, color:'#fbbf24', padding:'0.75rem 1rem' }} />
              </div>
            </div>
          </div>

          {/* Grand Total Summary */}
          <motion.div layout className="glass-card" style={{ marginTop:20, padding:'1.5rem 2rem', border:'1px solid rgba(99,102,241,0.3)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20, alignItems:'center' }}>
              <div style={{ textAlign:'center' }}>
                <p style={{ color:'var(--text-secondary)', fontSize:'0.8rem', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Grand Total</p>
                <p style={{ fontFamily:'var(--font-heading)', fontWeight:900, fontSize:'2rem', color:'#818cf8' }}>
                  ₹ {grandTotal.toLocaleString('en-IN', {minimumFractionDigits:2})}
                </p>
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ color:'var(--text-secondary)', fontSize:'0.8rem', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>System Total</p>
                <p style={{ fontFamily:'var(--font-heading)', fontWeight:800, fontSize:'1.5rem', color:'#fbbf24' }}>
                  ₹ {sysNum.toLocaleString('en-IN', {minimumFractionDigits:2})}
                </p>
              </div>
              <div style={{ textAlign:'center' }}>
                <p style={{ color:'var(--text-secondary)', fontSize:'0.8rem', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Difference</p>
                <p style={{ fontFamily:'var(--font-heading)', fontWeight:800, fontSize:'1.5rem', color: diff===0?'#34d399':diff>0?'#34d399':'#f87171' }}>
                  {diff===0 ? '✅ Balanced' : diff>0 ? `⬆️ +₹${diff.toFixed(2)}` : `⬇️ −₹${Math.abs(diff).toFixed(2)}`}
                </p>
              </div>
              <div style={{ textAlign:'center' }}>
                <button type="submit" disabled={loading}
                  style={{
                    padding:'0.9rem 2.5rem', borderRadius:'var(--radius-full)', border:'none',
                    background:'linear-gradient(135deg,#6366f1,#4f46e5)',
                    color:'#fff', fontWeight:800, fontSize:'1rem', cursor:loading?'not-allowed':'pointer',
                    opacity:loading?0.7:1, boxShadow:'0 6px 20px rgba(99,102,241,0.45)',
                    transition:'all 0.25s ease', display:'flex', alignItems:'center', gap:8, margin:'0 auto'
                  }}>
                  {loading ? (
                    <><span style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/> Submitting…</>
                  ) : <><IndianRupee size={18}/> Submit Shift {shift} Report</>}
                </button>
              </div>
            </div>
          </motion.div>
        </form>
      )}
      {/* Bigly Modal Popup */}
      <AnimatePresence>
        {modal && (
          <div className="modal-overlay" onClick={() => setModal(null)}>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="modal-box"
              style={{ maxWidth: 450, textAlign: 'center', borderTop: `5px solid ${modal.type === 'error' ? 'var(--danger)' : 'var(--success)'}` }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
                {modal.type === 'error' ? '❌' : '✅'}
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                {modal.title}
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '1.05rem' }}>
                {modal.text}
              </p>
              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '0.8rem' }}
                onClick={() => setModal(null)}
              >
                Understood
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="modal-box"
              style={{ maxWidth: 450, textAlign: 'center', borderTop: '5px solid var(--primary)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>❓</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Confirm Submission?
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '1.05rem' }}>
                You are about to submit the <strong>Shift {shift}</strong> report for <strong>{formatDate(date)}</strong>.<br/>
                Total Amount: <strong>₹{grandTotal.toLocaleString('en-IN')}</strong><br/><br/>
                Are you sure all details are correct?
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-ghost" style={{ flex: 1, padding: '0.8rem' }} onClick={() => setShowConfirm(false)}>
                  No, Review
                </button>
                <button className="btn-primary" style={{ flex: 1, padding: '0.8rem' }} onClick={processSubmit}>
                  Yes, Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

    </div>
  );
}
