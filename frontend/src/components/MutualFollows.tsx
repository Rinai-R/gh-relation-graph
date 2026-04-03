import { useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { FindMutualFollowsBetween } from '../../wailsjs/go/main/App';
import { MutualFollowResult } from '../types/graph';

export function MutualFollows() {
  const { isAuthenticated } = useAuthContext();
  const [userA, setUserA] = useState('');
  const [userB, setUserB] = useState('');
  const [result, setResult] = useState<MutualFollowResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFind = async () => {
    if (!userA.trim() || !userB.trim() || !isAuthenticated) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await FindMutualFollowsBetween(userA.trim(), userB.trim());
      setResult(r);
    } catch (e: any) {
      setError(e?.message || 'Failed to find mutual follows');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #e1e8f0' }}>
      <div style={{ fontSize: 12, marginBottom: 6, color: '#7e8fa6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Mutual Follows
      </div>
      <input
        type="text"
        value={userA}
        onChange={(e) => setUserA(e.target.value)}
        placeholder="User A"
        style={{
          width: '100%',
          padding: '5px 8px',
          fontSize: 12,
          background: '#ffffff',
          border: '1px solid #c0cfe0',
          borderRadius: 6,
          color: '#2c3e50',
          outline: 'none',
          marginBottom: 4,
          boxSizing: 'border-box',
        }}
      />
      <input
        type="text"
        value={userB}
        onChange={(e) => setUserB(e.target.value)}
        placeholder="User B"
        style={{
          width: '100%',
          padding: '5px 8px',
          fontSize: 12,
          background: '#ffffff',
          border: '1px solid #c0cfe0',
          borderRadius: 6,
          color: '#2c3e50',
          outline: 'none',
          marginBottom: 6,
          boxSizing: 'border-box',
        }}
      />
      <button
        onClick={handleFind}
        disabled={loading || !isAuthenticated || !userA.trim() || !userB.trim()}
        style={{
          width: '100%',
          padding: '6px',
          fontSize: 12,
          background: loading ? '#c0cfe0' : '#5ba0e0',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: loading ? 'default' : 'pointer',
          opacity: !isAuthenticated || !userA.trim() || !userB.trim() ? 0.5 : 1,
        }}
      >
        {loading ? 'Searching...' : 'Find Mutual'}
      </button>

      {error && <div style={{ fontSize: 11, color: '#e05252', marginTop: 4 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: '#7e8fa6', marginBottom: 4 }}>
            {result.count} mutual follow{result.count !== 1 ? 's' : ''} found
          </div>
          <div style={{ maxHeight: 150, overflow: 'auto' }}>
            {(result.mutualUsers || []).map((u) => (
              <div
                key={u.login}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 0',
                  fontSize: 12,
                  color: '#2c3e50',
                }}
              >
                <img
                  src={u.avatarUrl}
                  alt={u.login}
                  style={{ width: 20, height: 20, borderRadius: '50%' }}
                />
                <span>{u.login}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
