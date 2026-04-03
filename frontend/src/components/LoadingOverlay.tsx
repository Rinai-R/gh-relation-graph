import { useGraphContext } from '../context/GraphContext';

export function LoadingOverlay() {
  const { state } = useGraphContext();
  const progress = state.progress;

  if (!state.isLoading) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(247, 249, 252, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
    }}>
      {/* Spinner */}
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid #e1e8f0',
        borderTop: '3px solid #4a90d9',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: 16,
      }} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {progress ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2c3e50', marginBottom: 4 }}>
            Exploring {progress.currentUser}
          </div>
          <div style={{ fontSize: 12, color: '#5a6c7e', marginBottom: 4 }}>
            Depth {progress.currentDepth} | {progress.nodesFound} users | {progress.edgesFound} connections
          </div>
          <div style={{ fontSize: 11, color: '#7e8fa6' }}>
            Queue: {progress.queueSize} remaining
          </div>
          {progress.status === 'rate_limited' && (
            <div style={{
              marginTop: 8,
              padding: '4px 12px',
              background: '#fff8e6',
              color: '#b07800',
              borderRadius: 12,
              fontSize: 11,
            }}>
              Rate limited - waiting for reset...
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 14, color: '#5a6c7e' }}>Loading...</div>
      )}
    </div>
  );
}
