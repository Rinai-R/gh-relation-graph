import React from 'react';
import { useGraphContext } from '../context/GraphContext';
import { AuthPanel } from './AuthPanel';
import { SearchBar } from './SearchBar';
import { UserSelector } from './UserSelector';
import { MutualFollows } from './MutualFollows';
import { StatusBar } from './StatusBar';
import { GraphView } from './GraphView';
import { ChartView } from './ChartView';
import { LoadingOverlay } from './LoadingOverlay';
import { Network, BarChart3 } from 'lucide-react';

export function Layout() {
  const { state, dispatch } = useGraphContext();

  const setTab = (tab: 'graph' | 'chart') => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  };

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.titleGroup}>
          <Network size={22} style={{ color: '#4a90d9' }} />
          <h1 style={styles.title}>GitHub Relation Graph</h1>
        </div>
      </header>

      <div style={styles.body}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.authSection}>
            <AuthPanel />
          </div>
          <SearchBar />
          <UserSelector />
          <MutualFollows />
          <StatusBar />
        </aside>

        {/* Main content */}
        <main style={styles.main}>
          {/* Tab bar */}
          <div style={styles.tabBar}>
            <button
              onClick={() => setTab('graph')}
              style={{
                ...styles.tab,
                ...(state.activeTab === 'graph' ? styles.tabActive : {}),
              }}
            >
              <Network size={15} />
              Graph View
            </button>
            <button
              onClick={() => setTab('chart')}
              style={{
                ...styles.tab,
                ...(state.activeTab === 'chart' ? styles.tabActive : {}),
              }}
            >
              <BarChart3 size={15} />
              Chart View
            </button>
          </div>

          {/* Content area */}
          <div style={styles.content}>
            <div style={{ width: '100%', height: '100%', display: state.activeTab === 'graph' ? 'block' : 'none' }}>
              <GraphView />
            </div>
            <div style={{ width: '100%', height: '100%', display: state.activeTab === 'chart' ? 'block' : 'none' }}>
              <ChartView />
            </div>
            <LoadingOverlay />
          </div>
        </main>
      </div>

      {/* Global spinner keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 20px',
    height: 52,
    background: '#ffffff',
    borderBottom: '1px solid #e1e8f0',
    flexShrink: 0,
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#2c3e50',
    margin: 0,
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: 280,
    flexShrink: 0,
    background: '#f0f4f9',
    padding: '0 16px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    borderRight: '1px solid #e1e8f0',
  },
  authSection: {
    padding: '12px 0',
    borderBottom: '1px solid #e1e8f0',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#f7f9fc',
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    gap: 0,
    background: '#ffffff',
    borderBottom: '1px solid #e1e8f0',
    padding: '0 16px',
    flexShrink: 0,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#7e8fa6',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: {
    color: '#4a90d9',
    borderBottomColor: '#4a90d9',
  },
  content: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
};
