'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PA_BASE=12570,PA_TAPER=100000;
function getPA(i){if(i<=PA_TAPER)return PA_BASE;return Math.max(0,PA_BASE-Math.floor((i-PA_TAPER)/2));}
function calcRUK(i){const pa=getPA(i),t=Math.max(0,i-pa);return{pa,taxable:t,basic:Math.min(t,37700)*0.20,higher:Math.max(0,Math.min(t-37700,74870))*0.40,additional:Math.max(0,t-112570)*0.45,starter:0,intermediate:0,advanced:0,top:0,get total(){return this.basic+this.higher+this.additional;}};}
function calcScotland(i){const pa=getPA(i),t=Math.max(0,i-pa);const s=Math.min(t,2306)*0.19,b=Math.max(0,Math.min(t-2306,8649))*0.20,im=Math.max(0,Math.min(t-10955,15045))*0.21,h=Math.max(0,Math.min(t-26000,47000))*0.42,a=Math.max(0,Math.min(t-73000,52140))*0.45,top=Math.max(0,t-125140)*0.48;return{pa,taxable:t,starter:s,basic:b,intermediate:im,higher:h,advanced:a,top,additional:0,total:s+b+im+h+a+top};}
function calcNI(i){return Math.max(0,Math.min(i,50270)-12570)*0.06+Math.max(0,i-50270)*0.02;}
const LOANS={none:{label:'None',t:0,r:0},plan1:{label:'Plan 1 — £26,900',t:26900,r:0.09},plan2:{label:'Plan 2 — £29,385',t:29385,r:0.09},plan4:{label:'Plan 4 Scotland — £33,795',t:33795,r:0.09},plan5:{label:'Plan 5 — £25,000',t:25000,r:0.09},pg:{label:'Postgraduate — £21,000 (6%)',t:21000,r:0.06}};
const fmt=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
function AN({v}){return <motion.span key={Math.round(v)} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.3}}>{fmt(v)}</motion.span>;}
function Row({label,value,indent,bold}){if(!value&&!bold)return null;return(<div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',paddingLeft:indent?16:0}}><span style={{color:bold?'var(--ea-cream)':'var(--ea-text-muted)',fontSize:14}}>{label}</span><span style={{color:bold?'var(--ea-gold-mid)':'var(--ea-silver)',fontSize:bold?20:14,fontWeight:bold?700:500,fontFamily:bold?'Playfair Display,serif':'inherit'}}><AN v={value}/></span></div>);}

export default function TaxEstimator2026(){
  const[income,setIncome]=useState(45000);
  const[region,setRegion]=useState('ruk');
  const[loan,setLoan]=useState('none');
  const tax=region==='scotland'?calcScotland(income):calcRUK(income);
  const ni=calcNI(income);
  const lp=LOANS[loan];
  const loanAmt=Math.max(0,income-lp.t)*lp.r;
  const total=tax.total+ni+loanAmt;
  const takeHome=income-total;
  const eff=income>0?((total/income)*100).toFixed(1):'0.0';
  return(<div className="ea-card" style={{maxWidth:540,margin:'0 auto'}}>
    <h2 className="text-metallic-gold" style={{fontFamily:'Playfair Display,serif',fontSize:22,marginBottom:20}}>Tax Estimator 2026/27</h2>
    <label style={{color:'var(--ea-text-muted)',fontSize:12,display:'block',marginBottom:6}}>REGION</label>
    <select className="ea-input" value={region} onChange={e=>setRegion(e.target.value)} style={{marginBottom:16}}>
      <option value="ruk">England, Wales &amp; Northern Ireland</option>
      <option value="scotland">Scotland</option>
    </select>
    <label style={{color:'var(--ea-text-muted)',fontSize:12,display:'block',marginBottom:6}}>ANNUAL INCOME <span className="text-metallic-gold" style={{fontSize:16,fontWeight:700}}>{fmt(income)}</span></label>
    <input type="range" min={0} max={150000} step={500} value={income} onChange={e=>setIncome(Number(e.target.value))} style={{width:'100%',accentColor:'var(--ea-gold-mid)',marginBottom:10}}/>
    <input type="number" className="ea-input" value={income} onChange={e=>setIncome(Math.max(0,Number(e.target.value)))} style={{marginBottom:16}}/>
    <label style={{color:'var(--ea-text-muted)',fontSize:12,display:'block',marginBottom:6}}>STUDENT LOAN</label>
    <select className="ea-input" value={loan} onChange={e=>setLoan(e.target.value)} style={{marginBottom:24}}>
      {Object.entries(LOANS).map(([k,p])=><option key={k} value={k}>{p.label}</option>)}
    </select>
    <AnimatePresence mode="wait">
      <motion.div key={region} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:0.28}}>
        <div style={{borderTop:'1px solid var(--ea-border)',paddingTop:16}}>
          <Row label="Personal Allowance" value={tax.pa}/>
          <Row label="Taxable Income" value={tax.taxable}/>
          {region==='ruk'?<><Row label="Basic Rate (20%)" value={tax.basic} indent/><Row label="Higher Rate (40%)" value={tax.higher} indent/><Row label="Additional Rate (45%)" value={tax.additional} indent/></>:<><Row label="Starter (19%)" value={tax.starter} indent/><Row label="Basic (20%)" value={tax.basic} indent/><Row label="Intermediate (21%)" value={tax.intermediate} indent/><Row label="Higher (42%)" value={tax.higher} indent/><Row label="Advanced (45%)" value={tax.advanced} indent/><Row label="Top (48%)" value={tax.top} indent/></>}
          <Row label="Total Income Tax" value={tax.total}/>
          <Row label="NI Class 4 (6%/2%)" value={ni}/>
          {loanAmt>0&&<Row label="Student Loan" value={loanAmt}/>}
          <div style={{borderTop:'1px solid var(--ea-border)',marginTop:12,paddingTop:16}}>
            <Row label={`Net Take-Home (${eff}% effective rate)`} value={takeHome} bold/>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  </div>);
}
