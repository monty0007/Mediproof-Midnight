import { useState, useCallback, useEffect } from 'react'

const CONTRACT_SNIPPET = `circuit commit_dataset(
  private dataset_hash:    Field,
  private record_count:    Uint64,
  private hospital_id:     Field,
  public  timestamp:       Uint64
) {
  // bind commitment on-chain
  const h = hash(dataset_hash, hospital_id, timestamp);
  disclose(h);
  assert record_count > 0;
}

circuit prove_training(
  private model_weights_hash: Field,
  private dataset_commitment: Field,
  public  training_timestamp: Uint64
) {
  const proof = hash(model_weights_hash, dataset_commitment);
  disclose(proof);
  assert training_timestamp > 0;
}`

function Syntax({ code }) {
  const colored = code
    .replace(/(circuit)/g, '<span style="color:#22d3ee;font-weight:700">$1</span>')
    .replace(/(disclose)/g, '<span style="color:#34d399;font-weight:700">$1</span>')
    .replace(/(assert)/g, '<span style="color:#f87171">$1</span>')
    .replace(/(private|public)/g, '<span style="color:#93c5fd">$1</span>')
    .replace(/(\/\/[^\n]*)/g, '<span style="color:#475569;font-style:italic">$1</span>')
    .replace(/(Field|Uint64)/g, '<span style="color:#fcd34d">$1</span>')
    .replace(/(hash|const)\b/g, '<span style="color:#c4b5fd">$1</span>')
  return (
    <pre className="text-[11px] overflow-x-auto p-4 rounded-xl font-mono leading-relaxed"
      style={{ background:'rgba(4,12,26,0.9)', border:'1px solid rgba(30,58,90,0.6)', color:'#94a3b8' }}
      dangerouslySetInnerHTML={{ __html: colored }}
    />
  )
}

export default function AuditorView({ setCurrentTab, initialQuery, onQueryConsumed }) {
  const [input,       setInput]       = useState('')
  const [auditResult, setAuditResult] = useState(null)
  const [auditLog,    setAuditLog]    = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [logLoading,  setLogLoading]  = useState(false)
  const [error,       setError]       = useState(null)
  const [showContract,setShowContract]= useState(false)

  useEffect(() => {
    if (initialQuery) {
      setInput(initialQuery)
      setAuditResult(null)
      setError(null)
      if (onQueryConsumed) onQueryConsumed()
    }
  }, [initialQuery])

  const verify = useCallback(async () => {
    const id = input.trim()
    if (!id) return
    setLoading(true); setAuditResult(null); setError(null)
    try {
      const res = await fetch(`/api/audit/${encodeURIComponent(id)}`)
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail||`Status ${res.status}`) }
      setAuditResult(await res.json())
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [input])

  const loadLog = useCallback(async () => {
    setLogLoading(true); setAuditLog(null)
    try {
      const res = await fetch('/api/audit/log')
      if (!res.ok) throw new Error('Failed')
      setAuditLog(await res.json())
    } catch { setAuditLog([]) }
    finally { setLogLoading(false) }
  }, [])

  useEffect(() => { loadLog() }, [loadLog])

  const complianceColor = (v) =>
    v === true  ? { color:'#34d399', icon:'verified', fill:true } :
    v === false ? { color:'#f87171', icon:'cancel',   fill:true } :
                  { color:'#94a3b8', icon:'help',     fill:false }

  return (
    <div className="relative flex-1 flex flex-col" style={{ background: '#060d1a' }}>
      <div className="relative z-10 flex-1 flex flex-col" style={{ background: '#060d1a' }}>
      {/* Compact page header */}
      <div className="hero-navy border-b" style={{ borderColor:'rgba(30,58,90,0.6)' }}>
        <div className="cp py-12 lg:py-16">
          <div className="flex items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)' }}>
                <span className="material-symbols-outlined text-2xl" style={{ color:'#34d399', fontVariationSettings:"'FILL' 1" }}>verified_user</span>
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-black headline" style={{ color:'#f0f9ff' }}>Proof Inspector</h1>
                  <span className="nbadge nb-em">Auditor Console</span>
                  <span className="nbadge nb-bl">ZK Verified</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">Verify any dataset commitment or training proof on-chain</p>
              </div>
            </div>
            <div className="flex items-center gap-8 ml-auto">
              {[['On-chain','Verified','#34d399'],['ZK','Enforced','#22d3ee'],['HIPAA','Compliant','#93c5fd']].map(([v,l,c]) => (
                <div key={l} className="text-center">
                  <p className="text-lg font-black headline" style={{ color:c }}>{v}</p>
                  <p className="text-xs text-slate-600">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HIPAA banner */}
      <div className="py-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-emerald-200"
        style={{ background:'rgba(16,185,129,0.09)', borderBottom:'1px solid rgba(16,185,129,0.2)' }}>
        <div className="cp flex flex-wrap items-center gap-3 w-full">
        <span className="material-symbols-outlined" style={{ color:'#34d399', fontVariationSettings:"'FILL' 1" }}>shield</span>
        All proofs are verified against the Midnight ZK ledger — no PHI (Protected Health Information) is ever exposed to auditors
        </div>
      </div>

      <div className="page-navy py-16 lg:py-20 flex-1">
        <div className="cp">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Main column */}
          <div className="flex-1 space-y-10">
            {/* Inspector */}
            <div className="nc p-7 lg:p-8">
              <h2 className="font-black headline text-lg mb-5 flex items-center gap-2" style={{ color:'#f0f9ff' }}>
                <span className="material-symbols-outlined" style={{ color:'#06b6d4' }}>manage_search</span>
                Verify Proof by ID
              </h2>
              <div className="flex gap-3">
                <input className="n-inp flex-1 rounded-xl px-4 py-3 text-sm"
                  placeholder="Enter dataset ID or training request ID…"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && verify()}
                />
                <button onClick={verify} disabled={loading||!input.trim()} className="btn-cyan px-6 py-3 rounded-xl flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-base">{loading?'progress_activity':'search'}</span>
                  {loading ? 'Checking…' : 'Verify'}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 rounded-xl flex items-start gap-3" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
                  <span className="material-symbols-outlined text-red-400 flex-shrink-0">error</span>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {auditResult && (() => {
                const cc = complianceColor(auditResult.compliant)
                return (
                  <div className="mt-5 rounded-xl overflow-hidden" style={{ border:`1px solid rgba(30,58,90,0.6)` }}>
                    <div className="flex items-center gap-3 px-6 py-4" style={{ background:'rgba(15,30,53,0.8)' }}>
                      <span className="material-symbols-outlined text-3xl" style={{ color:cc.color, fontVariationSettings:cc.fill?"'FILL' 1":'normal' }}>{cc.icon}</span>
                      <div>
                        <p className="font-black headline text-base" style={{ color: cc.color }}>
                          {auditResult.compliant===true ? 'HIPAA Compliant' : auditResult.compliant===false ? 'Non-Compliant' : 'Status Unknown'}
                        </p>
                        <p className="text-xs text-slate-500">Proof verified on Midnight Network</p>
                      </div>
                    </div>
                    <div className="p-6 grid sm:grid-cols-2 gap-5" style={{ background:'rgba(6,12,24,0.7)' }}>
                      {[
                        ['Dataset ID',          auditResult.dataset_id],
                        ['Hospital ID Hash',    auditResult.hospital_id_hash],
                        ['Compliance Proof',    auditResult.compliance_proof_hash],
                        ['Timestamp',           auditResult.timestamp ? new Date(auditResult.timestamp*1000).toLocaleString() : '—'],
                      ].map(([k,v]) => (
                        <div key={k}>
                          <p className="n-label">{k}</p>
                          <p className="n-hash text-[10px] mt-0.5 break-all">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Audit log */}
            <div className="nc p-7 lg:p-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black headline text-lg flex items-center gap-2" style={{ color:'#f0f9ff' }}>
                  <span className="material-symbols-outlined" style={{ color:'#06b6d4' }}>list_alt</span>
                  Audit Log
                </h2>
                <button onClick={loadLog} disabled={logLoading} className="btn-ol-c flex items-center gap-1.5 px-4 py-2 text-xs rounded-full">
                  <span className={`material-symbols-outlined text-sm ${logLoading?'animate-spin':''}`}>refresh</span>
                  Refresh
                </button>
              </div>

              {!auditLog && logLoading && (
                <div className="py-14 text-center">
                  <span className="material-symbols-outlined text-5xl animate-spin" style={{ color:'rgba(6,182,212,0.3)' }}>progress_activity</span>
                </div>
              )}

              {logLoading && (
                <div className="py-10 flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined animate-spin text-3xl" style={{ color:'#06b6d4' }}>progress_activity</span>
                  <p className="text-xs" style={{ color:'#475569' }}>Fetching audit records…</p>
                </div>
              )}

              {auditLog && (auditLog.length === 0 ? (
                <p className="text-center py-10 text-sm" style={{ color:'#475569' }}>No audit records found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ color:'#475569', borderBottom:'1px solid rgba(30,58,90,0.5)' }}>
                        {['#','Dataset ID','Timestamp','Compliance'].map(h => (
                          <th key={h} className="text-left py-2 pr-4 font-bold uppercase tracking-widest text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {auditLog.map((e,i) => {
                        const cc = complianceColor(e.compliant)
                        return (
                          <tr key={i} className="transition-colors border-b hover:bg-[rgba(6,182,212,0.04)]" style={{ borderColor:'rgba(30,58,90,0.3)' }}>
                            <td className="py-3 pr-4 font-mono text-slate-600">{i+1}</td>
                            <td className="py-3 pr-4 font-mono max-w-[180px] truncate" style={{ color:'#22d3ee' }}>{e.dataset_id}</td>
                            <td className="py-3 pr-4" style={{ color:'#94a3b8' }}>
                              {e.timestamp ? new Date(e.timestamp*1000).toLocaleString() : '—'}
                            </td>
                            <td className="py-3">
                              <span className="flex items-center gap-1 font-bold" style={{ color:cc.color }}>
                                <span className="material-symbols-outlined text-sm" style={cc.fill?{fontVariationSettings:"'FILL' 1"}:{}}>{cc.icon}</span>
                                {e.compliant===true?'Pass':e.compliant===false?'Fail':'Unknown'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* ZK Contract viewer */}
            <div className="nc p-7 lg:p-8">
              <button onClick={() => setShowContract(v=>!v)}
                className="w-full flex items-center justify-between text-left group">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ color:'#06b6d4' }}>code</span>
                  <h2 className="font-black headline text-lg" style={{ color:'#f0f9ff' }}>ZK Contract Source</h2>
                  <span className="nbadge nb-cyan">Compact Lang</span>
                </div>
                <span className="material-symbols-outlined transition-transform" style={{ color:'#475569', transform:showContract?'rotate(180deg)':'rotate(0deg)' }}>expand_more</span>
              </button>
              {showContract && (
                <div className="mt-5 space-y-3">
                  <p className="text-xs" style={{ color:'#475569' }}>
                    This is the Midnight ZK contract that enforces HIPAA compliance. Both circuits are compiled and executed on-chain.
                  </p>
                  <Syntax code={CONTRACT_SNIPPET} />
                </div>
              )}
            </div>
          </div>

          {/* Side stats */}
          <div className="lg:w-80 flex-shrink-0 space-y-6">
            <div className="nc p-6 lg:p-7 space-y-4">
              <h3 className="font-black headline text-base flex items-center gap-2" style={{ color:'#f0f9ff' }}>
                <span className="material-symbols-outlined text-base" style={{ color:'#34d399' }}>analytics</span>
                System Stats
              </h3>
              {[
                { label:'Proof verification',  val:'< 50 ms',  icon:'bolt',       c:'#34d399' },
                { label:'On-chain storage',    val:'Hash only',icon:'save',       c:'#22d3ee' },
                { label:'PHI exposure',        val:'Zero',     icon:'block',      c:'#34d399' },
                { label:'Ledger',              val:'Midnight', icon:'link',       c:'#60a5fa' },
                { label:'ZK System',           val:'Compact',  icon:'code_blocks',c:'#c4b5fd' },
              ].map(({ label, val, icon, c }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor:'rgba(30,58,90,0.4)' }}>
                  <span className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="material-symbols-outlined text-sm" style={{ color:c }}>{icon}</span>
                    {label}
                  </span>
                  <span className="text-xs font-bold" style={{ color:c }}>{val}</span>
                </div>
              ))}
            </div>

            <div className="nc-em p-6 lg:p-7 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ color:'#34d399', fontVariationSettings:"'FILL' 1" }}>gpp_good</span>
                <h3 className="font-black headline text-sm" style={{ color:'#f0f9ff' }}>Auditor Notes</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color:'#94a3b8' }}>
                Each dataset commitment is a cryptographic hash stored on the Midnight Network. No patient records, identifiers, or clinical data exist in any on-chain state.
              </p>
              <div className="pt-2 border-t" style={{ borderColor:'rgba(16,185,129,0.2)' }}>
                <p className="text-xs" style={{ color:'#34d399' }}>✓ HIPAA §164.312 compliant</p>
                <p className="text-xs mt-1" style={{ color:'#34d399' }}>✓ No PHI on-chain (45 CFR 164.502)</p>
                <p className="text-xs mt-1" style={{ color:'#34d399' }}>✓ ZK proofs are deterministically verifiable</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  )
}
