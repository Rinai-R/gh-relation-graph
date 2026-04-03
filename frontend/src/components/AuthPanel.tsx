import React, { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { StartDeviceFlow, PollOAuthOnce, CancelOAuth, SetToken, Logout } from '../../wailsjs/go/main/App';
import { LogOut, Github, KeyRound, Copy, Check, ExternalLink } from 'lucide-react';

type AuthMode = 'oauth' | 'pat';
type OAuthState = 'idle' | 'waiting_code' | 'waiting_auth' | 'error';

export function AuthPanel() {
  const { isAuthenticated, user, checkAuth, clearAuth } = useAuthContext();

  const [authMode, setAuthMode] = useState<AuthMode>('oauth');
  const [oauthState, setOauthState] = useState<OAuthState>('idle');
  const [userCode, setUserCode] = useState('');
  const [verificationUri, setVerificationUri] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalRef = useRef(5);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = () => {
    stopPolling();
    const ms = intervalRef.current * 1000;
    pollRef.current = setInterval(async () => {
      try {
        const result = await PollOAuthOnce();
        if (result.error) {
          stopPolling();
          setError(result.error);
          setOauthState('error');
          return;
        }
        if (result.done) {
          stopPolling();
          await checkAuth();
          setOauthState('idle');
          setUserCode('');
        }
        // else: still pending, keep polling
      } catch (err: unknown) {
        stopPolling();
        const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Poll failed');
        setError(msg);
        setOauthState('error');
      }
    }, ms);
  };

  const handleOAuthLogin = async () => {
    setError(null);
    setOauthState('waiting_code');
    try {
      const result = await StartDeviceFlow();
      setUserCode(result.userCode);
      setVerificationUri(result.verificationUri);
      intervalRef.current = result.interval || 5;
      setOauthState('waiting_auth');
      startPolling();
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to start OAuth');
      setError(msg);
      setOauthState('error');
    }
  };

  const handleCancelOAuth = async () => {
    stopPolling();
    try { await CancelOAuth(); } catch { /* ignore */ }
    setOauthState('idle');
    setUserCode('');
    setError(null);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handlePATConnect = async () => {
    if (!token.trim()) return;
    setConnecting(true);
    setError(null);
    try {
      await SetToken(token.trim());
      await checkAuth();
      setToken('');
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Failed to authenticate'));
    } finally {
      setConnecting(false);
    }
  };

  const handleLogout = async () => {
    try { await Logout(); clearAuth(); } catch { /* ignore */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePATConnect();
  };

  if (isAuthenticated && user) {
    return (
      <div style={styles.authenticated}>
        <img src={user.avatarUrl} alt={user.login} style={styles.avatar} />
        <span style={styles.loginName}>{user.login}</span>
        <button onClick={handleLogout} style={styles.logoutBtn} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  if (oauthState === 'waiting_auth' && userCode) {
    return (
      <div style={styles.oauthWaiting}>
        <div style={styles.codeLabel}>Enter this code on GitHub:</div>
        <div style={styles.codeRow}>
          <span style={styles.userCode}>{userCode}</span>
          <button onClick={handleCopyCode} style={styles.copyBtn} title="Copy code">
            {copied ? <Check size={14} color="#4caf50" /> : <Copy size={14} />}
          </button>
        </div>
        <a href={verificationUri} onClick={(e) => e.preventDefault()} style={styles.verifyLink}>
          <ExternalLink size={12} />
          {verificationUri}
        </a>
        <div style={styles.waitingText}>Waiting for authorization...</div>
        <button onClick={handleCancelOAuth} style={styles.cancelBtn}>Cancel</button>
      </div>
    );
  }

  if (oauthState === 'waiting_code') {
    return (
      <div style={styles.unauthenticated}>
        <div style={styles.waitingText}>Starting OAuth flow...</div>
      </div>
    );
  }

  return (
    <div style={styles.unauthenticated}>
      {authMode === 'oauth' ? (
        <>
          <button onClick={handleOAuthLogin} style={styles.oauthBtn}>
            <Github size={16} />
            Sign in with GitHub
          </button>
          <button onClick={() => { setAuthMode('pat'); setError(null); }} style={styles.switchLink}>
            <KeyRound size={12} />
            Use PAT instead
          </button>
        </>
      ) : (
        <>
          <div style={styles.inputGroup}>
            <KeyRound size={16} style={{ color: '#7e8fa6', flexShrink: 0 }} />
            <input
              type="password"
              placeholder="GitHub token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={handleKeyDown}
              style={styles.input}
              disabled={connecting}
            />
            <button
              onClick={handlePATConnect}
              disabled={connecting || !token.trim()}
              style={{ ...styles.connectBtn, opacity: connecting || !token.trim() ? 0.5 : 1 }}
            >
              {connecting ? '...' : 'Go'}
            </button>
          </div>
          <button onClick={() => { setAuthMode('oauth'); setError(null); }} style={styles.switchLink}>
            <Github size={12} />
            Use OAuth instead
          </button>
        </>
      )}
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  authenticated: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '2px solid #4a90d9',
  },
  loginName: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: 500,
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#7e8fa6',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  unauthenticated: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  oauthBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
  },
  switchLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    color: '#7e8fa6',
    fontSize: 12,
    cursor: 'pointer',
    padding: '2px 0',
  },
  oauthWaiting: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
  },
  codeLabel: {
    color: '#7e8fa6',
    fontSize: 12,
  },
  codeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  userCode: {
    color: '#2c3e50',
    fontSize: 20,
    fontWeight: 700,
    fontFamily: 'monospace',
    letterSpacing: 3,
    background: '#e8eff8',
    padding: '4px 12px',
    borderRadius: 6,
  },
  copyBtn: {
    background: 'none',
    border: '1px solid #c0cfe0',
    borderRadius: 4,
    color: '#7e8fa6',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  verifyLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: '#4a90d9',
    fontSize: 11,
    textDecoration: 'none',
  },
  waitingText: {
    color: '#7e8fa6',
    fontSize: 12,
    fontStyle: 'italic',
  },
  cancelBtn: {
    background: 'none',
    border: '1px solid #c0cfe0',
    borderRadius: 4,
    color: '#7e8fa6',
    fontSize: 12,
    cursor: 'pointer',
    padding: '4px 12px',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    background: '#ffffff',
    border: '1px solid #c0cfe0',
    borderRadius: 8,
    color: '#2c3e50',
    padding: '6px 10px',
    fontSize: 13,
    outline: 'none',
    width: 180,
  },
  connectBtn: {
    background: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  error: {
    color: '#e05252',
    fontSize: 12,
    textAlign: 'center',
  },
};
