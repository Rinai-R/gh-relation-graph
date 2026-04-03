import React, { useState, useMemo } from 'react';
import { useGraphContext } from '../context/GraphContext';
import { UserNode } from '../types/graph';
import { Users, UserPlus, Search, CheckSquare, Square, ChevronDown } from 'lucide-react';

type ListTab = 'followers' | 'following';

const PAGE_SIZE = 50;

export function UserSelector() {
  const { state, dispatch } = useGraphContext();
  const [listTab, setListTab] = useState<ListTab>('followers');
  const [filter, setFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const depthKeys = useMemo(
    () => Object.keys(state.depthLayers).map(Number).sort(),
    [state.depthLayers]
  );

  const currentLayer = state.depthLayers[state.currentDepth];
  const followers = currentLayer?.list?.followers || [];
  const following = currentLayer?.list?.following || [];
  const currentList = listTab === 'followers' ? followers : following;
  const selectedUsers = currentLayer?.selectedUsers || [];

  const filteredList = useMemo(() => {
    if (!currentList.length) return [];
    if (!filter.trim()) return currentList;
    const q = filter.toLowerCase();
    return currentList.filter(
      (u) =>
        u.login?.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q))
    );
  }, [currentList, filter]);

  const selectedSet = useMemo(() => new Set(selectedUsers), [selectedUsers]);

  const allLogins = useMemo(() => {
    const set = new Set<string>();
    followers.forEach((u) => u.login && set.add(u.login));
    following.forEach((u) => u.login && set.add(u.login));
    return Array.from(set);
  }, [followers, following]);

  // Don't render if no layers at all
  if (depthKeys.length === 0) return null;

  const visibleList = filteredList.slice(0, visibleCount);
  const hasMore = filteredList.length > visibleCount;

  const currentFilteredLogins = filteredList.map((u) => u.login).filter(Boolean);
  const allFilteredSelected = currentFilteredLogins.length > 0 && currentFilteredLogins.every((l) => selectedSet.has(l));

  const handleToggle = (login: string) => {
    dispatch({ type: 'TOGGLE_USER', payload: { depth: state.currentDepth, login } });
  };

  const handleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const toRemove = new Set(currentFilteredLogins);
      dispatch({
        type: 'SET_SELECTED_USERS',
        payload: { depth: state.currentDepth, users: selectedUsers.filter((u) => !toRemove.has(u)) },
      });
    } else {
      const merged = new Set(selectedUsers);
      currentFilteredLogins.forEach((l) => merged.add(l));
      dispatch({
        type: 'SET_SELECTED_USERS',
        payload: { depth: state.currentDepth, users: Array.from(merged) },
      });
    }
  };

  const handleSelectAll = () => {
    dispatch({
      type: 'SET_SELECTED_USERS',
      payload: { depth: state.currentDepth, users: allLogins },
    });
  };

  const handleDeselectAll = () => {
    dispatch({
      type: 'SET_SELECTED_USERS',
      payload: { depth: state.currentDepth, users: [] },
    });
  };

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const handleDepthChange = (depth: number) => {
    dispatch({ type: 'SET_CURRENT_DEPTH', payload: depth });
    setFilter('');
    setVisibleCount(PAGE_SIZE);
  };

  const handleListTabChange = (tab: ListTab) => {
    setListTab(tab);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <Users size={14} />
        <span>Select Users</span>
        <span style={styles.selectedCount}>
          {selectedUsers.length} selected
        </span>
      </div>

      {/* Depth tabs */}
      {depthKeys.length > 1 && (
        <div style={styles.depthTabs}>
          {depthKeys.map((d) => {
            const layer = state.depthLayers[d];
            const count = (layer?.selectedUsers?.length || 0);
            return (
              <button
                key={d}
                onClick={() => handleDepthChange(d)}
                style={{
                  ...styles.depthTab,
                  ...(state.currentDepth === d ? styles.depthTabActive : {}),
                }}
              >
                D{d} {count > 0 && <span style={styles.badge}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Followers / Following tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => handleListTabChange('followers')}
          style={{
            ...styles.tab,
            ...(listTab === 'followers' ? styles.tabActive : {}),
          }}
        >
          Followers ({followers.length})
        </button>
        <button
          onClick={() => handleListTabChange('following')}
          style={{
            ...styles.tab,
            ...(listTab === 'following' ? styles.tabActive : {}),
          }}
        >
          Following ({following.length})
        </button>
      </div>

      {/* Filter */}
      <div style={styles.filterRow}>
        <Search size={12} style={{ color: '#7e8fa6', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Filter users..."
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setVisibleCount(PAGE_SIZE); }}
          style={styles.filterInput}
        />
      </div>

      {/* Bulk actions */}
      <div style={styles.bulkActions}>
        <button onClick={handleSelectAllFiltered} style={styles.bulkBtn}>
          {allFilteredSelected ? 'Deselect' : 'Select'} Page
        </button>
        <button onClick={handleSelectAll} style={styles.bulkBtn}>
          All
        </button>
        <button onClick={handleDeselectAll} style={styles.bulkBtn}>
          None
        </button>
      </div>

      {/* User list */}
      <div style={styles.list}>
        {visibleList.length === 0 ? (
          <div style={styles.emptyText}>No users found</div>
        ) : (
          visibleList.map((user) => (
            <UserItem
              key={user.login}
              user={user}
              selected={selectedSet.has(user.login)}
              onToggle={handleToggle}
            />
          ))
        )}
        {hasMore && (
          <button onClick={handleShowMore} style={styles.showMoreBtn}>
            <ChevronDown size={12} />
            Show more ({filteredList.length - visibleCount} remaining)
          </button>
        )}
      </div>
    </div>
  );
}

function UserItem({
  user,
  selected,
  onToggle,
}: {
  user: UserNode;
  selected: boolean;
  onToggle: (login: string) => void;
}) {
  return (
    <div
      style={{
        ...styles.userItem,
        background: selected ? 'rgba(74, 144, 217, 0.08)' : 'transparent',
      }}
      onClick={() => onToggle(user.login)}
    >
      <div style={styles.checkbox}>
        {selected ? (
          <CheckSquare size={16} style={{ color: '#4a90d9' }} />
        ) : (
          <Square size={16} style={{ color: '#c0cfe0' }} />
        )}
      </div>
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.login} style={styles.avatar} />
      ) : (
        <div style={{ ...styles.avatar, background: '#c0cfe0' }} />
      )}
      <div style={styles.userInfo}>
        <div style={styles.userLogin}>{user.login}</div>
        {user.name && <div style={styles.userName}>{user.name}</div>}
      </div>
      <div style={styles.userFollowers}>
        <UserPlus size={10} />
        {user.followers || 0}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '12px 0',
    borderBottom: '1px solid #e1e8f0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#7e8fa6',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedCount: {
    marginLeft: 'auto',
    color: '#4a90d9',
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'none',
  },
  depthTabs: {
    display: 'flex',
    gap: 4,
  },
  depthTab: {
    flex: 1,
    padding: '5px 0',
    fontSize: 12,
    fontWeight: 600,
    color: '#7e8fa6',
    background: '#ffffff',
    border: '1px solid #c0cfe0',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  depthTabActive: {
    color: '#2c3e50',
    background: '#e8eff8',
    borderColor: '#4a90d9',
  },
  badge: {
    background: '#4a90d9',
    color: '#fff',
    fontSize: 10,
    borderRadius: 8,
    padding: '1px 5px',
    fontWeight: 500,
  },
  tabs: {
    display: 'flex',
    gap: 0,
    background: '#e8eff8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    padding: '6px 0',
    fontSize: 12,
    fontWeight: 500,
    color: '#7e8fa6',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    color: '#2c3e50',
    background: '#ffffff',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#ffffff',
    borderRadius: 6,
    padding: '4px 8px',
    border: '1px solid #dce5ef',
  },
  filterInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#2c3e50',
    fontSize: 12,
    outline: 'none',
    padding: '2px 0',
  },
  bulkActions: {
    display: 'flex',
    gap: 4,
  },
  bulkBtn: {
    flex: 1,
    padding: '4px 0',
    fontSize: 11,
    color: '#7e8fa6',
    background: '#ffffff',
    border: '1px solid #c0cfe0',
    borderRadius: 6,
    cursor: 'pointer',
  },
  list: {
    maxHeight: 320,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  emptyText: {
    color: '#7e8fa6',
    fontSize: 12,
    textAlign: 'center',
    padding: 16,
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  checkbox: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  userLogin: {
    color: '#2c3e50',
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userName: {
    color: '#7e8fa6',
    fontSize: 11,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userFollowers: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    color: '#7e8fa6',
    fontSize: 11,
    flexShrink: 0,
  },
  showMoreBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '8px 0',
    fontSize: 11,
    color: '#4a90d9',
    background: 'transparent',
    border: '1px solid #e1e8f0',
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: 4,
  },
};
