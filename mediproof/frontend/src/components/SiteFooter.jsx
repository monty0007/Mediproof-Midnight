export default function SiteFooter({ setCurrentTab }) {
  return (
    <footer className="sticky z-0 bottom-0 left-0 w-full"
      style={{ background: '#040c18', borderTop: '1px solid rgba(6,182,212,0.15)', minHeight: '380px' }}>
      <div className="relative w-full h-full overflow-hidden">

        {/* Content */}
        <div className="cp relative z-10 h-full flex flex-col justify-between py-12 gap-10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">

            {/* Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)', boxShadow: '0 0 16px rgba(6,182,212,0.35)' }}>
                  <span className="material-symbols-outlined text-xl"
                    style={{ color: '#f0f9ff', fontVariationSettings: "'FILL' 1" }}>medication</span>
                </div>
                <span className="text-xl font-black tracking-tight headline" style={{ color: '#f0f9ff' }}>
                  Medi<span style={{ color: '#06b6d4' }}>Proof</span>
                </span>
              </div>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                HIPAA-compliant healthcare AI powered by zero-knowledge proofs on the Midnight Network.
                Your data never leaves.
              </p>
              <div className="flex gap-2">
                <span className="nbadge nb-cyan">ZK Protected</span>
                <span className="nbadge nb-em">HIPAA</span>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-8 text-sm lg:flex lg:gap-16">
              <ul className="space-y-3">
                <li className="n-label">Platform</li>
                {[['home','Home'],['hospital','Hospital'],['researcher','Researcher'],['auditor','Auditor']].map(([tab,label]) => (
                  <li key={tab}>
                    <button onClick={() => setCurrentTab(tab)}
                      className="transition-colors hover:text-cyan-300 cursor-pointer"
                      style={{ color: '#475569', background: 'none', border: 'none', padding: 0 }}>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
              <ul className="space-y-3">
                <li className="n-label">Network</li>
                {[
                  ['Midnight Docs',  'https://docs.midnight.network'],
                  ['Testnet Faucet', 'https://midnight.network/faucet'],
                  ['AlphaShield',    'https://github.com/midnight-ntwrk/alphashield'],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="transition-colors hover:text-cyan-300"
                      style={{ color: '#475569' }}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
              <ul className="space-y-3">
                <li className="n-label">Legal</li>
                {['HIPAA §164.312','45 CFR 164.502','Privacy Policy','Open Source'].map(l => (
                  <li key={l} className="text-xs cursor-default" style={{ color: '#334155' }}>{l}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="divider-n" />
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs" style={{ color: '#334155' }}>
            <p>© 2026 MediProof · Built on <span style={{ color: '#22d3ee' }}>Midnight Network</span></p>
            <p>Zero patient records were harmed in the making of this platform</p>
          </div>
        </div>

        {/* Giant background wordmark */}
        <h2 className="absolute bottom-0 left-0 translate-y-[30%] font-black headline select-none pointer-events-none"
          style={{ fontSize: 'clamp(80px, 14vw, 200px)', lineHeight: 1, color: 'rgba(6,182,212,0.04)', whiteSpace: 'nowrap' }}>
          MediProof
        </h2>
      </div>
    </footer>
  )
}
