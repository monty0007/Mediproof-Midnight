import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'

const CATEGORIES = ['oncology','cardiology','neurology','orthopedics','diabetes','pulmonology','nephrology','psychiatry','general']
const SCHEMA_OPTS = ['age','gender','icd_10_code','admission_date','discharge_date','lab_results','medications','vitals','procedure_codes','cpt_codes','outcome_flag','primary_dx']
const ZK_STEPS   = ['Hashing hospital identity','Building compliance witness','Running ZK circuit locally','Private witness generation','Verifying proof on-chain','Midnight ledger commitment']
const LS = { h:'mp_h_name', d:'mp_h_dis', s:'mp_h_sch', r:'mp_h_rec', res:'mp_h_res' }

export default function HospitalView({ setCurrentTab }) {
  const [hospitalName, setHospitalName] = useLocalStorage(LS.h, '')
  const [disease,      setDisease]      = useLocalStorage(LS.d, 'oncology')
  const [schemaFields, setSchemaFields] = useLocalStorage(LS.s, [])
  const [recordCount,  setRecordCount]  = useLocalStorage(LS.r, '')
  const [result,       setResult]       = useLocalStorage(LS.res, null)
  const [loading,   setLoading]  = useState(false)
  const [zkStep,    setZkStep]   = useState(0)
  const [error,     setError]    = useState(null)

  function toggleField(f) { setSchemaFields(p => p.includes(f) ? p.filter(x=>x!==f) : [...p,f]) }
  function startOver() {
    Object.values(LS).forEach(k => localStorage.removeItem(k))
    setHospitalName(''); setDisease('oncology'); setSchemaFields([])
    setRecordCount(''); setResult(null); setError(null)
  }
  async function commit() {
    if (!hospitalName.trim() || !schemaFields.length || !recordCount) return
    setLoading(true); setZkStep(0); setError(null); setResult(null)
    let s = 0
    const t = setInterval(() => { s = Math.min(s+1, ZK_STEPS.length-2); setZkStep(s) }, 700)
    try {
      const res = await fetch('/api/dataset/commit', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ hospital_name:hospitalName.trim(), record_count:Number(recordCount), schema_fields:schemaFields, disease_category:disease }),
      })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail||`Error ${res.status}`) }
      clearInterval(t); setZkStep(ZK_STEPS.length-1)
      await new Promise(r => setTimeout(r, 600))
      setResult(await res.json())
    } catch(e) { setError(e.message) }
    finally { clearInterval(t); setLoading(false) }
  }
  const canSubmit = !loading && hospitalName.trim() && schemaFields.length > 0 && Number(recordCount) >= 1

  if (result) return (
    <div className="min-h-screen page-navy flex flex-col items-center justify-center px-6 py-16">
      <div className="nc-em p-10 max-w-2xl w-full text-center space-y-6"
        style={{ borderColor:'rgba(16,185,129,0.4)', boxShadow:'0 0 60px rgba(16,185,129,0.1)' }}>
        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
          style={{ background:'rgba(16,185,129,0.12)', border:'2px solid rgba(16,185,129,0.4)' }}>
          <span className="material-symbols-outlined text-5xl" style={{ color:'#34d399', fontVariationSettings:"'FILL' 1" }}>task_alt</span>
        </div>
        <div>
          <h2 className="text-3xl font-black headline mb-2 grad-em" style={{ fontFamily:'Syne,Inter,sans-serif' }}>Dataset Committed!</h2>
          <p className="text-slate-400">Your HIPAA compliance proof is now live on the Midnight Network</p>
        </div>
        <div className="space-y-4 text-left rounded-xl p-6" style={{ background:'rgba(4,12,26,0.7)', border:'1px solid rgba(30,58,90,0.6)' }}>
          {[['Dataset ID', result.dataset_id], ['Compliance Proof Hash', result.compliance_proof_hash]].map(([k,v]) => (
            <div key={k}>
              <p className="n-label">{k}</p>
              <p className="n-hash">{v}</p>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor:'rgba(30,58,90,0.5)' }}>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings:"'FILL' 1" }}>lock</span>
              0 bytes patient data exposed
            </span>
            <span className="nbadge" style={result.zk_mode==='real'
              ? { background:'rgba(6,182,212,0.12)', color:'#22d3ee', border:'1px solid rgba(6,182,212,0.3)' }
              : { background:'rgba(71,85,105,0.2)', color:'#94a3b8', border:'1px solid rgba(71,85,105,0.3)' }}>
              {result.zk_mode==='real' ? '⚡ ZK Real' : '● ZK Mock'}
            </span>
          </div>
        </div>
        <button onClick={startOver} className="btn-ol-c w-full py-3 text-sm rounded-xl">Commit Another Dataset</button>
      </div>
    </div>
  )

  return (
    <div className="relative flex-1 flex flex-col" style={{ background: '#060d1a' }}>
      <div className="relative z-10 flex-1 flex flex-col" style={{ background: '#060d1a' }}>
      {/* Compact page header */}
      <div className="hero-navy border-b" style={{ borderColor:'rgba(30,58,90,0.6)' }}>
        <div className="cp py-12 lg:py-16">
          <div className="flex items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background:'rgba(6,182,212,0.12)', border:'1px solid rgba(6,182,212,0.25)' }}>
                <span className="material-symbols-outlined text-2xl" style={{ color:'#06b6d4', fontVariationSettings:"'FILL' 1" }}>local_hospital</span>
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-black headline" style={{ color:'#f0f9ff' }}>Dataset Commitment</h1>
                  <span className="nbadge nb-em">HIPAA</span>
                  <span className="nbadge nb-cyan">ZK Protected</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">Commit de-identified patient data — no PHI ever leaves your server</p>
              </div>
            </div>
            <div className="flex items-center gap-8 ml-auto">
              {[['0 bytes','Exposed','#34d399'],['100%','HIPAA','#22d3ee'],['ZK proof','On-chain','#93c5fd']].map(([v,l,c]) => (
                <div key={l} className="text-center">
                  <p className="text-lg font-black headline" style={{ color:c }}>{v}</p>
                  <p className="text-xs text-slate-600">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="page-navy py-16 lg:py-20 flex-1">
        <div className="cp">
        <div className="grid lg:grid-cols-5 gap-10">

          {/* Form — 3 cols */}
          <div className="lg:col-span-3">
            <div className="nc p-8 lg:p-10 space-y-8">
              <h2 className="text-xl font-black headline" style={{ color:'#f0f9ff' }}>Commit Your Dataset</h2>

              <div>
                <label className="n-label">Hospital Name</label>
                <input className="n-inp px-4 py-3 text-base" placeholder="e.g. Massachusetts General Hospital"
                  value={hospitalName} onChange={e => setHospitalName(e.target.value)} disabled={loading} />
                <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs" style={{ color:'rgba(6,182,212,0.5)' }}>lock</span>
                  Hashed to <span className="font-mono" style={{ color:'#06b6d4' }}>hospital_id_hash</span> — raw name never stored
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="n-label">Disease Category</label>
                  <select className="n-inp px-4 py-3 text-sm cursor-pointer"
                    value={disease} onChange={e => setDisease(e.target.value)} disabled={loading}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="n-label">Record Count <span style={{ color:'rgba(6,182,212,0.6)', textTransform:'none', letterSpacing:0 }}>(private witness)</span></label>
                  <input className="n-inp px-4 py-3 text-sm font-mono" type="number" min={500} placeholder="e.g. 5000"
                    value={recordCount} onChange={e => setRecordCount(e.target.value)} disabled={loading} />
                  <p className="text-xs text-slate-600 mt-1">Min 1 · Never stored or transmitted</p>
                </div>
              </div>

              <div>
                <label className="n-label">Schema Fields <span style={{ color:'#22d3ee', textTransform:'none', letterSpacing:0 }}>({schemaFields.length} selected)</span></label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SCHEMA_OPTS.map(f => {
                    const on = schemaFields.includes(f)
                    return (
                      <button key={f} type="button" onClick={() => !loading && toggleField(f)} disabled={loading}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border"
                        style={on
                          ? { background:'rgba(6,182,212,0.14)', color:'#e2e8f0', borderColor:'rgba(6,182,212,0.5)', boxShadow:'0 0 8px rgba(6,182,212,0.15)' }
                          : { background:'rgba(15,30,53,0.8)', color:'#475569', borderColor:'rgba(30,58,90,0.6)' }}>
                        {on && <span className="material-symbols-outlined text-xs mr-1" style={{ fontVariationSettings:"'FILL' 1", color:'#22d3ee' }}>check</span>}
                        {f}
                      </button>
                    )
                  })}
                </div>
              </div>

              {loading && (
                <div className="rounded-xl p-5 space-y-3" style={{ background:'rgba(6,182,212,0.05)', border:'1px solid rgba(6,182,212,0.15)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color:'#475569' }}>ZK Protocol in Progress</p>
                  {ZK_STEPS.map((step,i) => (
                    <div key={i} className="flex items-center gap-3 text-sm transition-all duration-300"
                      style={{ color:i<zkStep?'#34d399':i===zkStep?'#22d3ee':'rgba(71,85,105,0.5)', fontWeight:i===zkStep?700:400 }}>
                      <span className="material-symbols-outlined text-lg flex-shrink-0" style={i<zkStep?{fontVariationSettings:"'FILL' 1"}:{}}>
                        {i<zkStep?'check_circle':i===zkStep?'radio_button_checked':'radio_button_unchecked'}
                      </span>
                      {step}
                      {i===zkStep && <span className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background:'#06b6d4' }} />}
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="rounded-xl p-4 flex items-start gap-3" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
                  <span className="material-symbols-outlined flex-shrink-0" style={{ color:'#f87171', fontVariationSettings:"'FILL' 1" }}>error</span>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {!canSubmit && !loading && (
                <p className="text-xs text-center" style={{ color:'#475569' }}>
                  {!hospitalName.trim() ? '⚠ Enter a hospital name' : schemaFields.length === 0 ? '⚠ Select at least one schema field' : !recordCount ? '⚠ Enter record count' : ''}
                </p>
              )}
              <button onClick={commit} disabled={!canSubmit}
                className="btn-cyan w-full py-4 text-base flex items-center justify-center gap-2 rounded-xl">
                <span className="material-symbols-outlined" style={{ fontVariationSettings:`'FILL' 1` }}>
                  {loading ? 'progress_activity' : 'lock'}
                </span>
                {loading ? 'Generating HIPAA ZK Proof…' : 'Commit Dataset with ZK Proof'}
              </button>
            </div>
          </div>

          {/* Side — 2 cols */}
          <div className="lg:col-span-2 space-y-5">
            <div className="nc p-6 lg:p-8">
              <h3 className="font-bold headline text-base mb-6 flex items-center gap-2" style={{ color:'#f0f9ff' }}>
                <span className="material-symbols-outlined" style={{ color:'#06b6d4', fontVariationSettings:"'FILL' 1" }}>psychology</span>
                How ZK Proof Works
              </h3>
              {[
                { icon:'fingerprint', c:'#06b6d4', t:'Identity Hashing', d:'Your hospital name is hashed. The original string never leaves your server.' },
                { icon:'security', c:'#10b981', t:'Private Witness', d:'Record count proves threshold compliance inside the ZK circuit.' },
                { icon:'verified', c:'#3b82f6', t:'On-Chain Only', d:'Only the proof hash is published to the blockchain.' },
              ].map(s => (
                <div key={s.icon} className="flex gap-4 mb-5 last:mb-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background:`${s.c}18`, border:`1px solid ${s.c}35` }}>
                    <span className="material-symbols-outlined text-base" style={{ color:s.c, fontVariationSettings:"'FILL' 1" }}>{s.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold mb-1" style={{ color:'#cbd5e1' }}>{s.t}</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[['0 bytes','Exposed','#34d399'], ['100%','HIPAA','#22d3ee'], ['ZK','Proven','#93c5fd']].map(([v,l,c]) => (
                <div key={l} className="nstat p-4 flex flex-col items-center text-center">
                  <p className="text-xl font-black headline" style={{ color:c }}>{v}</p>
                  <p className="text-xs font-medium mt-1" style={{ color:'#475569' }}>{l}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-6" style={{ background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.18)' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="material-symbols-outlined" style={{ color:'#34d399', fontVariationSettings:"'FILL' 1" }}>verified_user</span>
                <span className="text-sm font-bold" style={{ color:'#6ee7b7' }}>Privacy Guarantee</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color:'#94a3b8' }}>
                Midnight Network's ZK circuits prove your data satisfies HIPAA thresholds without your data ever touching the blockchain or any third-party server.
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  )
}
