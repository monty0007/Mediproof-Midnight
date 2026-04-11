import { useState } from 'react'
import Navbar from './components/Navbar'
import HomeView from './views/HomeView'
import HospitalView from './views/HospitalView'
import ResearcherView from './views/ResearcherView'
import AuditorView from './views/AuditorView'
import { useMidnight } from './hooks/useMidnight.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'

const VALID_TABS = ['home', 'hospital', 'researcher', 'auditor']

function App() {
  const [currentTab, setCurrentTab] = useLocalStorage('mp_tab', 'home')
  // Guard against stale/invalid stored values
  const safeTab = VALID_TABS.includes(currentTab) ? currentTab : 'home'
  const midnight = useMidnight()
  const [auditQuery, setAuditQuery] = useState('')

  function goAudit(datasetId) {
    setAuditQuery(datasetId)
    setCurrentTab('auditor')
  }

  return (
    <div className="flex flex-col min-h-screen w-full" style={{ background:'#060d1a', color:'#e2e8f0' }}>
      <Navbar
        currentTab={safeTab}
        setCurrentTab={setCurrentTab}
        midnight={midnight}
      />

      {/* All tabs stay mounted — CSS hidden preserves their internal state */}
      <div className={safeTab === 'home' ? 'flex-1 flex flex-col' : 'hidden'}>
        <HomeView setCurrentTab={setCurrentTab} />
      </div>
      <div className={safeTab === 'hospital' ? 'flex-1 flex flex-col' : 'hidden'}>
        <HospitalView midnight={midnight} setCurrentTab={setCurrentTab} />
      </div>
      <div className={safeTab === 'researcher' ? 'flex-1 flex flex-col' : 'hidden'}>
        <ResearcherView midnight={midnight} setCurrentTab={setCurrentTab} goAudit={goAudit} />
      </div>
      <div className={safeTab === 'auditor' ? 'flex-1 flex flex-col' : 'hidden'}>
        <AuditorView midnight={midnight} setCurrentTab={setCurrentTab} initialQuery={auditQuery} onQueryConsumed={() => setAuditQuery('')} />
      </div>
    </div>
  )
}

export default App
