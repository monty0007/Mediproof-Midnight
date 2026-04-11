import { useState, useEffect, useCallback } from 'react'

const DISEASE_STYLES = {
  oncology:    { c:'#f87171', bg:'rgba(248,113,113,0.1)',  border:'rgba(248,113,113,0.25)' },
  cardiology:  { c:'#60a5fa', bg:'rgba(96,165,250,0.1)',   border:'rgba(96,165,250,0.25)' },
  neurology:   { c:'#22d3ee', bg:'rgba(34,211,238,0.1)',   border:'rgba(34,211,238,0.25)' },
  orthopedics: { c:'#fcd34d', bg:'rgba(252,211,77,0.1)',   border:'rgba(252,211,77,0.25)' },
  diabetes:    { c:'#fb923c', bg:'rgba(251,146,60,0.1)',   border:'rgba(251,146,60,0.25)' },
  pulmonology: { c:'#7dd3fc', bg:'rgba(125,211,252,0.1)',  border:'rgba(125,211,252,0.25)' },
  nephrology:  { c:'#a78bfa', bg:'rgba(167,139,250,0.1)',  border:'rgba(167,139,250,0.25)' },
  psychiatry:  { c:'#f9a8d4', bg:'rgba(249,168,212,0.1)',  border:'rgba(249,168,212,0.25)' },
  general:     { c:'#34d399', bg:'rgba(52,211,153,0.1)',   border:'rgba(52,211,153,0.25)' },
}
const DEF = { c:'#22d3ee', bg:'rgba(6,182,212,0.1)', border:'rgba(6,182,212,0.25)' }

const TRAIN_STEPS = [
  { icon:'download',      label:'Fetching de-identified shard' },
  { icon:'privacy_tip',   label:'Initialising privacy budget' },
  { icon:'model_training',label:'Running private training circuit' },
  { icon:'hub',           label:'Generating prove_training ZK proof' },
  { icon:'cloud_upload',  label:'Submitting to Midnight ledger' },
]

export default function ResearcherView({ setCurrentTab, goAudit }) {
  const [datasets,    setDatasets]    = useState([])
  const [loadingDs,   setLoadingDs]   = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [sending,     setSending]     = useState(false)
  const [trainResult, setTrainResult] = useState(null)
  const [error,       setError]       = useState(null)
  const [trainStep,   setTrainStep]   = useState(0)
  const [toast,       setToast]       = useState(null)

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    setToast('Dataset ID copied to clipboard!')
    setTimeout(() => setToast(null), 2500)
  }

  const loadDatasets = useCallback(async () => {
    setLoadingDs(true)
    try {
      const res = await fetch('/api/dataset/list')
      if (!res.ok) throw new Error('Failed')
      setDatasets(await res.json())
    } catch { setDatasets([]) }
    finally { setLoadingDs(false) }
  }, [])

  useEffect(() => { loadDatasets() }, [loadDatasets])

  async function requestTraining() {
    if (!selected) return
    setSending(true); setTrainResult(null); setError(null); setTrainStep(0)

    // Fire API call concurrently — don't await yet
    let apiResult = null, apiError = null
    const apiCall = fetch('/api/training/request', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ dataset_id: selected.id || selected.dataset_id, researcher_id:'researcher_'+Date.now(), model_type:'transformer' }),
    }).then(async r => {
      if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.detail||`Error ${r.status}`) }
      return r.json()
    }).then(d => { apiResult = d }).catch(e => { apiError = e.message })

    // Animate steps one-by-one — 1.4 s each so every step is visible
    for (let i = 0; i < TRAIN_STEPS.length; i++) {
      setTrainStep(i)
      await new Promise(r => setTimeout(r, 1400))
    }

    // Wait for API to finish (usually already done by now)
    await apiCall

    if (apiError) setError(apiError)
    else setTrainResult(apiResult)
    setSending(false)
  }

  return (
    <>
    <div className="relative flex-1 flex flex-col" style={{ background: '#060d1a' }}>
      <div className="relative z-10 flex-1 flex flex-col" style={{ background: '#060d1a' }}>
      {/* Compact page header */}
      <div className="hero-navy border-b" style={{ borderColor:'rgba(30,58,90,0.6)' }}>
        <div className="cp py-12 lg:py-16">
          <div className="flex items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)' }}>
                <span className="material-symbols-outlined text-2xl" style={{ color:'#34d399', fontVariationSettings:"'FILL' 1" }}>science</span>
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-black headline" style={{ color:'#f0f9ff' }}>Dataset Browser</h1>
                  <span className="nbadge nb-bl">Research Portal</span>
                  <span className="nbadge nb-em">Privacy-Preserving AI</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">Browse HIPAA-proven datasets · Submit private training jobs</p>
              </div>
            </div>
            <div className="flex items-center gap-8 ml-auto">
              {[[datasets.length,'Datasets','#22d3ee'],['100%','HIPAA Proven','#34d399'],['0','Bytes Exposed','#93c5fd']].map(([v,l,c]) => (
                <div key={l} className="text-center">
                  <p className="text-lg font-black headline" style={{ color:c }}>{v}</p>
                  <p className="text-xs text-slate-600">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="page-navy py-16 lg:py-20 flex-1">
        <div className="cp">
        <div className="grid lg:grid-cols-[1fr_26rem] xl:grid-cols-[1fr_30rem] gap-10">

          {/* Dataset grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color:'#475569' }}>
                {loadingDs ? 'Loading…' : `${datasets.length} Dataset${datasets.length !== 1 ? 's' : ''} published`}
              </p>
              <button onClick={loadDatasets} disabled={loadingDs}
                className="btn-ol-c flex items-center gap-1.5 px-4 py-2 text-xs rounded-full">
                <span className={`material-symbols-outlined text-sm ${loadingDs ? 'animate-spin' : ''}`}>refresh</span>
                Refresh
              </button>
            </div>

            {!loadingDs && datasets.length === 0 ? (
              <div className="nc p-20 flex flex-col items-center gap-5 text-center">
                <span className="material-symbols-outlined text-6xl" style={{ color:'rgba(6,182,212,0.15)' }}>dataset</span>
                <div>
                  <p className="text-lg font-bold" style={{ color:'#94a3b8' }}>No datasets yet</p>
                  <p className="text-base text-slate-500 mt-2">Switch to the Hospital tab to commit your first dataset</p>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {datasets.map(d => {
                  const sty = DISEASE_STYLES[d.disease_category] || DEF
                  const picked = selected?.id === d.id
                  return (
                    <div key={d.id}
                      onClick={() => { setSelected(d); setTrainResult(null); setError(null) }}
                      className={`nc p-6 cursor-pointer space-y-4 ${picked ? 'nc-active' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="nbadge" style={{ background:sty.bg, color:sty.c, border:`1px solid ${sty.border}` }}>
                            {d.disease_category || 'general'}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-bold" style={{ color:'#34d399' }}>
                            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings:"'FILL' 1" }}>verified</span>HIPAA
                          </span>
                        </div>
                        {picked && <span className="material-symbols-outlined" style={{ color:'#06b6d4', fontVariationSettings:"'FILL' 1" }}>radio_button_checked</span>}
                      </div>
                      <div>
                        <p className="n-label">Dataset ID</p>
                        <p className="font-mono text-[10px] text-slate-500 truncate">{d.id}</p>
                      </div>
                      {d.schema_fields?.length > 0 && (
                        <div>
                          <p className="n-label">Schema Fields</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {d.schema_fields.slice(0, 5).map(f => (
                              <span key={f} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{ background:'rgba(6,182,212,0.1)', color:'#67e8f9', border:'1px solid rgba(6,182,212,0.2)' }}>
                                {f}
                              </span>
                            ))}
                            {d.schema_fields.length > 5 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{ background:'rgba(71,85,105,0.15)', color:'#94a3b8', border:'1px solid rgba(71,85,105,0.25)' }}>
                                +{d.schema_fields.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor:'rgba(30,58,90,0.5)' }}>
                        <div>
                          <p className="n-label">Exposed</p>
                          <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings:"'FILL' 1" }}>lock</span>0 bytes
                          </p>
                        </div>
                        <div>
                          <p className="n-label">ZK Mode</p>
                          <p className="text-xs font-bold" style={{ color: d.zk_mode==='real'?'#22d3ee':'#475569' }}>
                            {d.zk_mode==='real' ? '⚡ Real' : '● Mock'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Training panel */}
          <div>
            <div className="nc p-7 lg:p-8 lg:sticky lg:top-24 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b" style={{ borderColor:'rgba(30,58,90,0.5)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'rgba(6,182,212,0.12)', border:'1px solid rgba(6,182,212,0.25)' }}>
                  <span className="material-symbols-outlined" style={{ color:'#06b6d4', fontVariationSettings:"'FILL' 1" }}>model_training</span>
                </div>
                <h2 className="font-black headline text-base" style={{ color:'#f0f9ff' }}>Private Training</h2>
              </div>

              {!selected ? (
                <div className="py-14 text-center space-y-4">
                  <span className="material-symbols-outlined text-5xl" style={{ color:'rgba(6,182,212,0.15)' }}>touch_app</span>
                  <p className="text-base" style={{ color:'#94a3b8' }}>Select a dataset to begin a private training job</p>
                </div>
              ) : !trainResult ? (
                <>
                  <div className="rounded-xl p-4" style={{ background:'rgba(6,182,212,0.07)', border:'1px solid rgba(6,182,212,0.15)' }}>
                    <p className="n-label">Selected Dataset</p>
                    <p className="text-sm font-bold capitalize mb-1" style={{ color:'#e2e8f0' }}>{selected.disease_category||'Unknown'}</p>
                    <p className="n-hash text-[10px]">{selected.id}</p>
                  </div>

                  {sending && (
                    <div className="space-y-3">
                      {TRAIN_STEPS.map((step,i) => (
                        <div key={i} className="flex items-center gap-3 text-xs transition-all duration-300"
                          style={{ color:i<trainStep?'#34d399':i===trainStep?'#22d3ee':'rgba(71,85,105,0.4)', fontWeight:i===trainStep?700:400 }}>
                          <span className="material-symbols-outlined text-base flex-shrink-0" style={i<trainStep?{fontVariationSettings:"'FILL' 1"}:{}}>
                            {i<trainStep?'check_circle':step.icon}
                          </span>
                          {step.label}
                          {i===trainStep && <span className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:'#06b6d4' }} />}
                        </div>
                      ))}
                    </div>
                  )}

                  {error && <div className="rounded-xl p-3" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}><p className="text-red-300 text-xs">{error}</p></div>}

                  <button onClick={requestTraining} disabled={sending}
                    className="btn-cyan w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings:`'FILL' 1` }}>{sending?'progress_activity':'play_circle'}</span>
                    {sending ? 'Training Running…' : 'Submit Training Request'}
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.22)' }}>
                    <span className="material-symbols-outlined text-3xl" style={{ color:'#34d399', fontVariationSettings:"'FILL' 1" }}>check_circle</span>
                    <div>
                      <p className="font-bold text-emerald-300 text-sm">Training Complete</p>
                      <p className="text-xs" style={{ color:'#475569' }}>ZK proof generated</p>
                    </div>
                  </div>
                  <div className="space-y-3 rounded-xl p-4" style={{ background:'rgba(4,12,26,0.7)', border:'1px solid rgba(30,58,90,0.5)' }}>
                    {[['Request ID',trainResult.request_id],['Status',trainResult.status],['Model Hash',trainResult.model_output_hash],['Training Proof',trainResult.training_proof_hash]].map(([k,v]) => (
                      <div key={k}><p className="n-label">{k}</p><p className="n-hash text-[10px]">{v}</p></div>
                    ))}
                    {trainResult.dataset_id && (
                      <div className="pt-2 border-t" style={{ borderColor:'rgba(30,58,90,0.5)' }}>
                        <p className="n-label">Dataset ID <span style={{ color:'#64748b' }}>(use in Auditor)</span></p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="n-hash text-[10px] flex-1 truncate">{trainResult.dataset_id}</p>
                          <button onClick={() => copyToClipboard(trainResult.dataset_id)}
                            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                            style={{ background:'rgba(6,182,212,0.1)', border:'1px solid rgba(6,182,212,0.25)', color:'#22d3ee' }}>
                            <span className="material-symbols-outlined text-xs">content_copy</span>Copy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-center" style={{ color:'#475569' }}>Patient data was never exposed to this model</p>
                  <div className="flex gap-2">
                    {trainResult.dataset_id && (
                      <button onClick={() => goAudit ? goAudit(trainResult.dataset_id) : setCurrentTab('auditor')}
                        className="btn-cyan flex-1 py-2.5 text-sm rounded-xl flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings:"'FILL' 1" }}>verified_user</span>
                        Audit This Dataset
                      </button>
                    )}
                    <button onClick={() => { setTrainResult(null); setSelected(null) }}
                      className={`btn-ol-c py-2.5 text-sm rounded-xl ${trainResult.dataset_id ? 'px-4' : 'flex-1'}`}>New Request</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>

    {/* Copy toast */}
    {toast && (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl"
        style={{ background:'rgba(4,20,16,0.92)', border:'1px solid rgba(16,185,129,0.45)', color:'#34d399', backdropFilter:'blur(16px)' }}>
        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings:"'FILL' 1" }}>check_circle</span>
        {toast}
      </div>
    )}
    </>
  )
}
