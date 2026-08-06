import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from './data/supabase';
import { ReelIdeas } from './ReelIdeas';
import { ShotTracker } from './ShotTracker';
import './App.css';

const TABS = [
  { id: 'shots', label: 'Shot Tracker' },
  { id: 'reels', label: 'Reel Ideas' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function initialTab(): TabId {
  const hash = window.location.hash.replace('#', '');
  return TABS.some((t) => t.id === hash) ? (hash as TabId) : 'shots';
}

export default function App() {
  const [tab, setTab] = useState<TabId>(initialTab);

  // Keep the tab in the URL hash so a refresh (or a shared link) lands in the
  // same place.
  useEffect(() => {
    window.location.hash = tab;
  }, [tab]);

  // Left/right arrows move between tabs, as expected for a tablist.
  const handleTabKeys = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Event Production</h1>
        <p className="page-subtitle">
          {isSupabaseConfigured ? 'Shared with your team in real time' : 'Saved on this device'}
        </p>
      </header>

      <div className="tabs" role="tablist" aria-label="Sections" onKeyDown={handleTabKeys}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="tab-panel"
      >
        {tab === 'shots' ? <ShotTracker /> : <ReelIdeas />}
      </div>
    </div>
  );
}
