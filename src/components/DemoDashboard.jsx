'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TaxEstimator2026 from './TaxEstimator2026';
const EXPENSES=[{id:1,cat:'Software',desc:'Adobe Creative Suite',amt:599,date:'2026-03-01',ok:true},{id:2,cat:'Travel',desc:'Client meeting — London',amt:84,date:'2026-03-08',ok:true},{id:3,cat:'Equipment',desc:'Mechanical keyboard',amt:129,date:'2026-03-12',ok:true},{id:4,cat:'Professional',desc:'Accountant consultation',amt:200,date:'2026-03-15',ok:true},{id:5,cat:'Marketing',desc:'Instagram ads',amt:75,date:'2026-03-20',ok:false}];
const INCOME=45000,EXP=EXPENSES.reduce((s,e)=>s+e.amt,0);
const fmt=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
const STATS=[{label:'Total Income',val:fmt(INCOME),color:'#4ADE80'},{label:'Total Expenses',val:fmt(EXP),color:'#F87171'},{label:'Net Profit',val:fmt(INCOME-EXP),color:'#FDB931'},{label:'Est. Tax',val:fmt(Math.round(INCOME*0.23)),color:'#C0C0C0'}];
export default function DemoDashboard(){
  const[modal,setModal]=useState(false);
  const[action,setAction]=useState('');
  function trigger(a){setAction(a);setModal(true);}
  return(<motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:0.5,ease:'easeOut'}} style={{minHeight:'100vh',background:'var(--ea-indigo)',paddingBottom:64}}>
    <div style={{background:'rgba(253,185,49,0.08)',borderBottom:'1px solid rgba(253,185,49,0.2)',padding:'10px 24px',textAlign:'center',fontSize:13,color:'var(--ea-gold-mid)'}}>
      👀 Demo Mode — no login required. <button onClick={()=>trigger('sign up')} style={{textDecoration:'underline',background:'none',border:'none',color:'var(--ea-gold-mid)',cursor:'pointer',fontSize:13}}>Create a free account to save →</button>
    </div>
    <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 24px'}}>
      <h1 style={{fontFamily:'Playfair Display,serif',fontSize:28,marginBottom:4}}><span className="text-metallic-gold">Overview</span></h1>
      <p style={{color:'var(--ea-text-muted)',fontSize:14,marginBottom:32}}>Demo data — Tax Year 6 April 2026 – 5 April 2027</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:28}}>
        {STATS.map((s,i)=><motion.div key={s.label} className="ea-card" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}><div style={{color:'var(--ea-text-muted)',fontSize:12,marginBottom:8,textTransform:'uppercase',letterSpacing:'0.08em'}}>{s.label}</div><div style={{fontSize:24,fontWeight:700,color:s.color,fontFamily:'Playfair Display,serif'}}>{s.val}</div></motion.div>)}
      </div>
      <div style={{display:'flex',gap:12,marginBottom:36,flexWrap:'wrap'}}>
        <button className="ea-btn-gold" onClick={()=>trigger('save your data')}>💾 Save Data</button>
        <button className="ea-btn-ghost" onClick={()=>trigger('connect your bank')}>🏦 Connect Bank</button>
      </div>
      <div style={{marginBottom:36}}><TaxEstimator2026/></div>
      <div className="ea-card">
        <h2 style={{fontFamily:'Playfair Display,serif',fontSize:18,marginBottom:16}}>Recent Expenses</h2>
        {EXPENSES.map((e,i)=><motion.div key={e.id} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*0.06}} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:i<EXPENSES.length-1?'1px solid var(--ea-border)':'none'}}><div><div style={{fontSize:14,color:'var(--ea-cream)',marginBottom:2}}>{e.desc}</div><div style={{fontSize:12,color:'var(--ea-text-muted)'}}>{e.cat} · {e.date}</div></div><div style={{textAlign:'right'}}><div style={{fontWeight:600,color:'var(--ea-gold-mid)',marginBottom:2}}>£{e.amt}</div>{e.ok&&<span className="ea-badge" style={{fontSize:10}}>HMRC allowable</span>}</div></motion.div>)}
      </div>
    </div>
    <AnimatePresence>{modal&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setModal(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:24}}><motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}} transition={{type:'spring',stiffness:300,damping:28}} className="ea-card" onClick={e=>e.stopPropagation()} style={{maxWidth:420,width:'100%',textAlign:'center',padding:36}}><div style={{fontSize:44,marginBottom:12}}>✨</div><h2 className="text-metallic-gold" style={{fontFamily:'Playfair Display,serif',fontSize:22,marginBottom:12}}>Want to {action}?</h2><p style={{color:'var(--ea-text-muted)',fontSize:14,lineHeight:1.7,marginBottom:28}}>Sign in to create your free EasyAcco account and save your numbers, track expenses, and get your personalised 2026/27 tax estimate.</p><div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:16}}><a href="/auth/signup" style={{textDecoration:'none'}}><button className="ea-btn-gold">Create Free Account</button></a><a href="/auth/login" style={{textDecoration:'none'}}><button className="ea-btn-ghost">Sign In</button></a></div><button onClick={()=>setModal(false)} style={{background:'none',border:'none',color:'var(--ea-text-muted)',cursor:'pointer',fontSize:13}}>Continue in demo mode</button></motion.div></motion.div>}</AnimatePresence>
  </motion.div>);
}
