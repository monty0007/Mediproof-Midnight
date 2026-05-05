const TABS = [
  { id: 'home',       label: 'Home',       icon: 'home' },
  { id: 'hospital',   label: 'Hospital',   icon: 'local_hospital' },
  { id: 'researcher', label: 'Researcher', icon: 'science' },
  { id: 'auditor',    label: 'Auditor',    icon: 'verified_user' },
]

export default function Navbar({ currentTab, setCurrentTab, midnight }) {
  const connected  = midnight?.walletStatus === 'connected'
  const connecting = midnight?.walletStatus === 'connecting'

  return (
    <nav className="sticky top-0 z-50 border-b w-full"
      style={{ background: 'rgba(6,13,26,0.96)', backdropFilter: 'blur(20px)', borderColor: 'rgba(30,58,90,0.7)' }}>

      {/* ── Desktop ──────────────────────────────────────── */}
      <div className="hidden md:flex items-center justify-between h-16 w-full max-w-[1600px] mx-auto px-5 lg:px-8 xl:px-12">

        {/* Left: Logo + nav tabs */}
        <div className="flex items-center h-full gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer flex-shrink-0" onClick={() => setCurrentTab('home')}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)', boxShadow: '0 0 14px rgba(6,182,212,0.35)' }}>
              <span className="material-symbols-outlined text-lg" style={{ color: '#f0f9ff', fontVariationSettings: "'FILL' 1" }}>medication</span>
            </div>
            <span className="text-lg font-black tracking-tight headline" style={{ color: '#f0f9ff' }}>
              Medi<span style={{ color: '#06b6d4' }}>Proof</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full nb-cyan nbadge">BETA</span>
          </div>

          {/* Divider */}
          <div className="h-5 w-px flex-shrink-0" style={{ background: 'rgba(30,58,90,0.9)' }} />

          {/* Nav tabs — flat, underline active */}
          <div className="flex items-center h-full">
            {TABS.map(tab => {
              const active = currentTab === tab.id
              return (
                <button key={tab.id} onClick={() => setCurrentTab(tab.id)}
                  className="relative flex items-center gap-2 px-4 h-full text-sm font-semibold transition-all duration-150"
                  style={{ color: active ? '#22d3ee' : '#64748b' }}>
                  <span className="material-symbols-outlined text-base"
                    style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{tab.icon}</span>
                  {tab.label}
                  {active && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full"
                      style={{ background: 'linear-gradient(90deg,#06b6d4,#22d3ee)', boxShadow: '0 0 8px rgba(6,182,212,0.5)' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right — zk mode chip + wallet */}
        <div className="flex items-center gap-3">
          {midnight?.serviceUp && (
            <span className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg"
              style={midnight.serviceZkMode === 'real'
                ? { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }
                : { background: 'rgba(6,182,212,0.07)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.18)' }}>
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                {midnight.serviceZkMode === 'real' ? 'bolt' : 'science'}
              </span>
              {midnight.serviceZkMode === 'real' ? 'ZK Real' : 'ZK Mock'}
            </span>
          )}

          {connected ? (
            <div className="flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-lg text-xs font-mono"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
              {midnight.walletAddress?.slice(0, 8)}…
              {midnight.walletDemo && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                  DEMO
                </span>
              )}
            </div>
          ) : connecting ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: 'rgba(6,182,212,0.07)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.2)' }}>
              <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
              Connecting…
            </div>
          ) : midnight?.walletStatus === 'error' ? (
            <button onClick={midnight?.connect} title={midnight?.walletError}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
              <span className="material-symbols-outlined text-sm">error</span>
              Retry Connect
            </button>
          ) : (
            <button onClick={midnight?.connect}
              className="btn-cyan flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs">
              <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile ───────────────────────────────────────── */}
      <div className="flex md:hidden items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentTab('home')}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#0891b2,#06b6d4)' }}>
            <span className="material-symbols-outlined text-base" style={{ color: '#f0f9ff', fontVariationSettings: "'FILL' 1" }}>medication</span>
          </div>
          <span className="text-base font-black tracking-tight headline" style={{ color: '#f0f9ff' }}>
            Medi<span style={{ color: '#06b6d4' }}>Proof</span>
          </span>
        </div>
        {connected ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} />
            {midnight.walletAddress?.slice(0, 6)}…
            {midnight.walletDemo && <span className="text-[9px] font-bold" style={{ color: '#fbbf24' }}>DEMO</span>}
          </div>
        ) : (
          <button onClick={midnight?.connect}
            className="btn-cyan flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs">
            <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
            Connect
          </button>
        )}
      </div>

      {/* Mobile tab bar */}
      <div className="flex md:hidden border-t overflow-x-auto" style={{ borderColor: 'rgba(30,58,90,0.6)' }}>
        {TABS.map(tab => {
          const active = currentTab === tab.id
          return (
            <button key={tab.id} onClick={() => setCurrentTab(tab.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-all relative"
              style={{ color: active ? '#22d3ee' : '#475569', minWidth: '60px' }}>
              <span className="material-symbols-outlined text-lg"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{tab.icon}</span>
              {tab.label}
              {active && (
                <span className="absolute top-0 left-3 right-3 h-0.5 rounded-b-full"
                  style={{ background: '#06b6d4' }} />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
