import SiteFooter from '../components/SiteFooter'

export default function HomeView({ setCurrentTab }) {
  const features = [
    { icon: 'local_hospital', c: '#06b6d4', title: 'Hospital Portal', desc: 'Commit de-identified patient datasets to the Midnight blockchain with a single click. Zero raw records ever leave your server.' },
    { icon: 'science',         c: '#10b981', title: 'Researcher Portal', desc: 'Browse HIPAA-proven datasets and submit private AI training jobs. Your model trains on provably compliant data — never on raw PHI.' },
    { icon: 'verified_user',   c: '#3b82f6', title: 'Auditor Console', desc: 'Verify any proof by dataset ID. Inspect on-chain compliance records and the full ZK contract source at any time.' },
    { icon: 'lock',            c: '#f59e0b', title: 'ZK Circuits',      desc: 'Two Compact-language circuits — commit_dataset and prove_training — enforce compliance rules mathematically, not by policy.' },
  ]

  const stats = [
    { v: '0 bytes',  l: 'Patient data on-chain' },
    { v: '100%',     l: 'HIPAA guaranteed' },
    { v: '< 50 ms',  l: 'Proof verification' },
    { v: 'On-chain', l: 'Midnight Network ledger' },
  ]

  const steps = [
    { n: '01', icon: 'fingerprint',   c: '#06b6d4', title: 'Hospital commits',      desc: 'Hospital hashes its identity and schema fields, then submits a ZK proof that the dataset meets HIPAA thresholds. Only hashes hit the chain.' },
    { n: '02', icon: 'model_training', c: '#10b981', title: 'Researcher trains',     desc: 'Researcher selects a proven dataset and launches a private training job. The backend runs the prove_training circuit — raw data never leaves the hospital.' },
    { n: '03', icon: 'manage_search',  c: '#3b82f6', title: 'Auditor verifies',      desc: 'Auditor queries the Midnight ledger by dataset or request ID. Every compliance fact is cryptographically verifiable — no trust required.' },
  ]

  const tech = [
    { icon: 'code_blocks', c: '#c4b5fd', name: 'Compact Language',   sub: 'ZK contract DSL by Midnight' },
    { icon: 'memory',      c: '#06b6d4', name: 'Midnight Network',    sub: 'Privacy-first L1 blockchain' },
    { icon: 'hub',         c: '#34d399', name: 'FastAPI + Python',    sub: 'HIPAA-safe backend layer' },
    { icon: 'web',         c: '#f59e0b', name: 'React + Vite',        sub: 'Instant frontend HMR' },
    { icon: 'security',    c: '#f87171', name: 'ZK Proof System',     sub: 'Prove compliance, reveal nothing' },
    { icon: 'dns',         c: '#7dd3fc', name: 'Node.js ZK Bridge',   sub: 'WASM proof pipeline at port 6300' },
  ]

  return (
    /* Outer wrapper: positions the main content ABOVE the sticky footer */
    <div className="relative flex-1 flex flex-col" style={{ background: '#060d1a' }}>

      {/* ── MAIN CONTENT (z-10, relative so it sits above footer) ── */}
      <div className="relative z-10 flex-1 flex flex-col" style={{ background: '#060d1a' }}>

        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="hero-navy border-b" style={{ borderColor: 'rgba(30,58,90,0.6)' }}>
          <div className="cp py-16 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              {/* Left — text + CTAs */}
              <div>
                <div className="flex flex-wrap gap-2 mb-5">
                  <span className="nbadge nb-cyan"><span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>Zero-Knowledge HIPAA</span>
                  <span className="nbadge nb-em">Midnight Network</span>
                  <span className="nbadge nb-bl">Healthcare AI</span>
                </div>
                <h1 className="text-5xl lg:text-6xl font-black headline tracking-tight leading-[1.04] mb-4" style={{ color: '#f0f9ff' }}>
                  HIPAA compliance<br />
                  <span className="grad-cyan">with zero trust</span>
                </h1>
                <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg">
                  Hospitals prove AI training is HIPAA-safe — cryptographically — without exposing a single byte of patient data to researchers, auditors, or the blockchain.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => setCurrentTab('hospital')}
                    className="btn-cyan flex items-center gap-2 px-7 py-3.5 text-base rounded-xl">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_hospital</span>
                    Hospital Portal
                  </button>
                  <button onClick={() => setCurrentTab('researcher')}
                    className="btn-ol-c flex items-center gap-2 px-7 py-3.5 text-base rounded-xl">
                    <span className="material-symbols-outlined">science</span>
                    Research Portal
                  </button>
                </div>
              </div>
              {/* Right — stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {stats.map((s) => (
                  <div key={s.l} className="nc p-6">
                    <p className="text-3xl font-black headline grad-cyan mb-2">{s.v}</p>
                    <p className="text-sm text-slate-500 uppercase tracking-widest">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── PROBLEM BANNER ────────────────────────────────── */}
        <section className="py-3 border-b" style={{ background: 'rgba(248,113,113,0.05)', borderColor: 'rgba(248,113,113,0.15)' }}>
          <div className="cp flex flex-wrap items-center gap-3 text-sm" style={{ color: '#fca5a5' }}>
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            <strong>The problem:</strong> HIPAA forbids sharing patient records — yet AI needs data to learn. Traditional consent architectures still expose PHI to model trainers. MediProof removes that entirely.
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────── */}
        <section className="page-navy border-b py-16 lg:py-20" style={{ borderColor: 'rgba(30,58,90,0.6)' }}>
          <div className="cp">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-10">
              <div>
                <p className="n-label mb-2">Protocol</p>
                <h2 className="text-4xl lg:text-5xl font-black headline" style={{ color: '#f0f9ff' }}>How it <span className="grad-cyan">works</span></h2>
              </div>
              <p className="text-slate-500 text-base max-w-md">Three roles. Three ZK-enforced steps. No trust at any boundary.</p>
            </div>
            <div className="grid lg:grid-cols-3 gap-5">
              {steps.map((s, i) => (
                <div key={i} className="nc p-7 space-y-5">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-black headline opacity-15" style={{ color: s.c, lineHeight: 1 }}>{s.n}</span>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${s.c}18`, border: `1px solid ${s.c}40` }}>
                      <span className="material-symbols-outlined text-2xl" style={{ color: s.c, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-black headline mb-2" style={{ color: '#f0f9ff' }}>{s.title}</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                  </div>
                  <button onClick={() => setCurrentTab(['hospital','researcher','auditor'][i])}
                    className="btn-ol-c flex items-center gap-1.5 px-4 py-2 text-xs rounded-full w-fit">
                    Open <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────── */}
        <section className="py-16 lg:py-20 border-b" style={{ background: '#060d1a', borderColor: 'rgba(30,58,90,0.6)' }}>
          <div className="cp">
            <div className="mb-10">
              <p className="n-label mb-2">Portals</p>
              <h2 className="text-4xl lg:text-5xl font-black headline" style={{ color: '#f0f9ff' }}>Three views, <span className="grad-em">one guarantee</span></h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map(f => (
                <div key={f.title} className="nc p-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: `${f.c}18`, border: `1px solid ${f.c}35` }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: f.c, fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                  </div>
                  <div>
                    <p className="font-black headline text-base mb-2" style={{ color: '#f0f9ff' }}>{f.title}</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TECH STACK ────────────────────────────────────── */}
        <section className="page-navy py-16 lg:py-20 border-b" style={{ borderColor: 'rgba(30,58,90,0.6)' }}>
          <div className="cp">
            <div className="mb-10">
              <p className="n-label mb-2">Stack</p>
              <h2 className="text-4xl lg:text-5xl font-black headline" style={{ color: '#f0f9ff' }}>Built on <span className="grad-cyan">proven tech</span></h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tech.map(t => (
                <div key={t.name} className="flex items-center gap-4 nc px-6 py-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${t.c}15`, border: `1px solid ${t.c}30` }}>
                    <span className="material-symbols-outlined" style={{ color: t.c, fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#e2e8f0' }}>{t.name}</p>
                    <p className="text-sm text-slate-500">{t.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ZK EXPLAINER ──────────────────────────────────── */}
        <section className="py-16 lg:py-20 border-b" style={{ background: '#060d1a', borderColor: 'rgba(30,58,90,0.6)' }}>
          <div className="cp">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div>
                <p className="n-label mb-2">Privacy model</p>
                <h2 className="text-3xl lg:text-4xl font-black headline mb-4" style={{ color: '#f0f9ff' }}>
                  What <span className="grad-em">never</span> leaves<br />your server
                </h2>
                <p className="text-base text-slate-400 leading-relaxed mb-6">
                  Zero-knowledge proofs let you convince the world you're HIPAA-compliant without showing anyone your data. The Midnight Network records only cryptographic hashes — the proof, not the payload.
                </p>
                <div className="space-y-3">
                  {[
                    ['cancel', '#f87171', 'Patient names, IDs, dates of birth'],
                    ['cancel', '#f87171', 'Diagnosis codes or clinical notes'],
                    ['cancel', '#f87171', 'Record counts or admission records'],
                    ['cancel', '#f87171', 'Hospital identity or location'],
                  ].map(([icon, c, label]) => (
                    <div key={label} className="flex items-center gap-3 text-sm" style={{ color: '#94a3b8' }}>
                      <span className="material-symbols-outlined text-base flex-shrink-0" style={{ color: c, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="n-label mb-3">What IS on-chain (public, immutable)</p>
                <div className="space-y-3">
                  {[
                    ['check_circle', '#34d399', 'SHA-256 of hospital identity (hospital_id_hash)'],
                    ['check_circle', '#34d399', 'SHA-256 of schema field list (schema_hash)'],
                    ['check_circle', '#34d399', 'Compliance status flag (0 or 1)'],
                    ['check_circle', '#34d399', 'ZK proof hash of the training run'],
                    ['check_circle', '#34d399', 'Commit timestamp (UTC)'],
                    ['check_circle', '#34d399', 'bytes_patient_exposed = 0 (always)'],
                  ].map(([icon, c, label]) => (
                    <div key={label} className="flex items-center gap-3 nc px-5 py-4 text-sm" style={{ color: '#94a3b8' }}>
                      <span className="material-symbols-outlined text-base flex-shrink-0" style={{ color: c, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                      <span className="font-mono text-xs" style={{ color: '#22d3ee' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="hero-navy py-16 lg:py-24">
          <div className="cp">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="nbadge nb-em mb-3 inline-flex">Ready to start</span>
                <h2 className="text-3xl lg:text-4xl font-black headline mt-2 mb-3" style={{ color: '#f0f9ff' }}>
                  Prove HIPAA compliance.<br /><span className="grad-cyan">Reveal nothing.</span>
                </h2>
                <p className="text-base text-slate-400 leading-relaxed mb-8 max-w-md">Pick your role below and start using the platform. All three portals are live in mock ZK mode.</p>
                <div className="flex flex-wrap gap-4">
                  {[['hospital','local_hospital','Hospital Portal','btn-cyan'],['researcher','science','Research Portal','btn-ol-c'],['auditor','verified_user','Auditor Console','btn-ol-c']].map(([tab,icon,label,cls]) => (
                    <button key={tab} onClick={() => setCurrentTab(tab)}
                      className={`${cls} flex items-center gap-2 px-6 py-3 text-sm rounded-xl`}>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon:'lock',         c:'#06b6d4', t:'Zero PHI on-chain',      d:'Only cryptographic hashes are published to the Midnight ledger' },
                  { icon:'verified_user',c:'#34d399', t:'HIPAA guaranteed',       d:'ZK circuits enforce compliance rules — mathematically, not by policy' },
                  { icon:'bolt',         c:'#f59e0b', t:'Sub-50ms verification',   d:'Any auditor can verify proof validity in under 50 milliseconds' },
                  { icon:'hub',          c:'#93c5fd', t:'Midnight Network',        d:'Privacy-first L1 blockchain built for confidential compute' },
                ].map(f => (
                  <div key={f.t} className="nc p-4 space-y-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:`${f.c}18`, border:`1px solid ${f.c}35` }}>
                      <span className="material-symbols-outlined" style={{ color:f.c, fontVariationSettings:"'FILL' 1" }}>{f.icon}</span>
                    </div>
                    <p className="font-bold text-sm" style={{ color:'#e2e8f0' }}>{f.t}</p>
                    <p className="text-sm text-slate-500 leading-relaxed">{f.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>{/* end z-10 main content */}

      {/* ── STICKY FOOTER ── */}
      <SiteFooter setCurrentTab={setCurrentTab} />

    </div>
  )
}
