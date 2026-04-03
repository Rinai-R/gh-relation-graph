import React, { useState, useEffect } from 'react';
import { useGraphContext } from '../context/GraphContext';
import { FetchFollowList, FetchFollowListForUsers, BuildGraphFromSelected, CancelBuild, GetGraphStats, FindMutualFollows } from '../../wailsjs/go/main/App';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';
import { BFSProgress } from '../types/graph';
import { Search, X, Users, Loader, ChevronRight, Network } from 'lucide-react';

export function SearchBar() {
  const { state, dispatch } = useGraphContext();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const handler = (progress: BFSProgress) => {
      dispatch({ type: 'SET_PROGRESS', payload: progress });
    };
    EventsOn('bfs:progress', handler);
    return () => {
      EventsOff('bfs:progress');
    };
  }, [dispatch]);

  // Step 1: Fetch depth-1 followers/following for center user
  const handleFetchList = async () => {
    if (!username.trim() || state.isFetchingList) return;
    dispatch({ type: 'SET_FETCHING_LIST', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_CENTER_USER', payload: username.trim() });
    try {
      const list = await FetchFollowList(username.trim());
      dispatch({ type: 'SET_DEPTH_LAYER', payload: { depth: 1, list } });
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to fetch user list');
      dispatch({ type: 'SET_ERROR', payload: msg });
    } finally {
      dispatch({ type: 'SET_FETCHING_LIST', payload: false });
    }
  };

  // Step 2: Expand — fetch next depth from selected users at current depth
  const handleExpand = async () => {
    const currentLayer = state.depthLayers[state.currentDepth];
    if (!currentLayer || currentLayer.selectedUsers.length === 0) return;

    const nextDepth = state.currentDepth + 1;
    if (nextDepth > 3) return;

    dispatch({ type: 'SET_FETCHING_LIST', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      // Collect all known logins to exclude
      const excludeLogins = [state.centerUser];
      for (const d in state.depthLayers) {
        const layer = state.depthLayers[Number(d)];
        if (layer?.list) {
          (layer.list.followers || []).forEach((u) => excludeLogins.push(u.login));
          (layer.list.following || []).forEach((u) => excludeLogins.push(u.login));
        }
      }

      const list = await FetchFollowListForUsers(
        currentLayer.selectedUsers,
        excludeLogins,
        nextDepth,
      );
      dispatch({ type: 'SET_DEPTH_LAYER', payload: { depth: nextDepth, list } });
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to expand');
      dispatch({ type: 'SET_ERROR', payload: msg });
    } finally {
      dispatch({ type: 'SET_FETCHING_LIST', payload: false });
    }
  };

  // Step 3: Build graph from all selected users across all depths
  const handleBuildGraph = async () => {
    if (state.isLoading) return;

    // Collect selectedByDepth
    const selectedByDepth: Record<number, string[]> = {};
    let totalSelected = 0;
    for (const d in state.depthLayers) {
      const depth = Number(d);
      const layer = state.depthLayers[depth];
      if (layer && layer.selectedUsers.length > 0) {
        selectedByDepth[depth] = layer.selectedUsers;
        totalSelected += layer.selectedUsers.length;
      }
    }
    if (totalSelected === 0) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_PROGRESS', payload: null });
    try {
      const graph = await BuildGraphFromSelected(state.centerUser, selectedByDepth);
      dispatch({ type: 'SET_GRAPH', payload: graph });
      const [stats, mutualEdges] = await Promise.all([
        GetGraphStats(graph),
        FindMutualFollows(graph),
      ]);
      dispatch({ type: 'SET_STATS', payload: stats });
      dispatch({ type: 'SET_MUTUAL_EDGES', payload: mutualEdges });
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to build graph');
      dispatch({ type: 'SET_ERROR', payload: msg });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_PROGRESS', payload: null });
    }
  };

  const handleCancel = async () => {
    try { await CancelBuild(); } catch { /* ignore */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFetchList();
  };

  // Count total selected across all depths
  let totalSelected = 0;
  for (const d in state.depthLayers) {
    totalSelected += (state.depthLayers[Number(d)]?.selectedUsers?.length || 0);
  }

  const hasLayers = Object.keys(state.depthLayers).length > 0;
  const currentLayer = state.depthLayers[state.currentDepth];
  const canExpand = currentLayer && currentLayer.selectedUsers.length > 0 && state.currentDepth < 3;

  return (
    <div style={styles.container}>
      <div style={styles.label}>
        <Search size={14} />
        <span>Explore User</span>
      </div>
      <input
        type="text"
        placeholder="GitHub username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={handleKeyDown}
        style={styles.input}
        disabled={state.isFetchingList || state.isLoading}
      />

      {/* Step 1: Fetch depth-1 list */}
      <button
        onClick={handleFetchList}
        disabled={!username.trim() || state.isFetchingList || state.isLoading}
        style={{
          ...styles.fetchBtn,
          opacity: !username.trim() || state.isFetchingList ? 0.5 : 1,
        }}
      >
        {state.isFetchingList ? (
          <>
            <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Fetching...
          </>
        ) : (
          <>
            <Users size={14} />
            Fetch Users
          </>
        )}
      </button>

      {/* Actions when we have layers */}
      {hasLayers && !state.isLoading && (
        <div style={styles.actionRow}>
          {/* Expand next depth */}
          {canExpand && (
            <button
              onClick={handleExpand}
              disabled={state.isFetchingList}
              style={{
                ...styles.expandBtn,
                opacity: state.isFetchingList ? 0.5 : 1,
              }}
            >
              <ChevronRight size={14} />
              Expand Depth {state.currentDepth + 1}
            </button>
          )}

          {/* Build graph */}
          {totalSelected > 0 && (
            <button onClick={handleBuildGraph} style={styles.buildBtn}>
              <Network size={14} />
              Build Graph ({totalSelected})
            </button>
          )}
        </div>
      )}

      {/* Loading / Cancel */}
      {state.isLoading && (
        <div style={styles.buttonRow}>
          <button onClick={handleCancel} style={styles.cancelBtn}>
            <X size={14} />
            Cancel
          </button>
          {state.progress && (
            <div style={styles.progressText}>
              {state.progress.nodesFound} users, {state.progress.edgesFound} edges
            </div>
          )}
        </div>
      )}

      {state.error && <div style={styles.error}>{state.error}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '16px 0',
    borderBottom: '1px solid #e1e8f0',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#7e8fa6',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    background: '#ffffff',
    border: '1px solid #c0cfe0',
    borderRadius: 8,
    color: '#2c3e50',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  fetchBtn: {
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 0',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  expandBtn: {
    background: '#5ba0e0',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 0',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buildBtn: {
    background: '#3a7bc8',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 0',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  cancelBtn: {
    background: '#e05252',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 0',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  progressText: {
    color: '#7e8fa6',
    fontSize: 12,
    textAlign: 'center',
  },
  error: {
    color: '#e05252',
    fontSize: 12,
  },
};
