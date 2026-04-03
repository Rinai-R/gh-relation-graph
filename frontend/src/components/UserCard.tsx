import { useGraphContext } from '../context/GraphContext';
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime';

export function UserCard() {
  const { state, dispatch } = useGraphContext();
  const user = state.selectedNode;

  if (!user) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      right: 12,
      width: 260,
      background: '#ffffff',
      borderRadius: 12,
      boxShadow: '0 4px 16px rgba(44, 62, 80, 0.12)',
      overflow: 'hidden',
      zIndex: 10,
    }}>
      {/* Header */}
      <div style={{
        background: '#4a90d9',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <img
          src={user.avatarUrl}
          alt={user.login}
          style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.6)' }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name || user.login}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>@{user.login}</div>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_SELECTED_NODE', payload: null })}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.75)',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 16px' }}>
        {user.bio && (
          <div style={{ fontSize: 12, color: '#5a6c7e', marginBottom: 8, lineHeight: 1.4 }}>
            {user.bio}
          </div>
        )}

        {user.company && (
          <div style={{ fontSize: 11, color: '#7e8fa6', marginBottom: 4 }}>
            Company: {user.company}
          </div>
        )}

        {user.location && (
          <div style={{ fontSize: 11, color: '#7e8fa6', marginBottom: 8 }}>
            Location: {user.location}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#2c3e50' }}>{user.followers}</div>
            <div style={{ fontSize: 10, color: '#7e8fa6' }}>Followers</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#2c3e50' }}>{user.following}</div>
            <div style={{ fontSize: 10, color: '#7e8fa6' }}>Following</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#4a90d9' }}>{user.depth}</div>
            <div style={{ fontSize: 10, color: '#7e8fa6' }}>Depth</div>
          </div>
        </div>

        {/* View on GitHub */}
        <button
          onClick={() => BrowserOpenURL(`https://github.com/${user.login}`)}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: 12,
            background: '#f0f4f9',
            color: '#2c3e50',
            border: '1px solid #e1e8f0',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          View on GitHub
        </button>
      </div>
    </div>
  );
}
