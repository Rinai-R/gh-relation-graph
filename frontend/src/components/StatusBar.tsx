import { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { GetRateLimitInfo } from '../../wailsjs/go/main/App';
import { RateLimitInfo } from '../types/graph';

export function StatusBar() {
  const { isAuthenticated } = useAuthContext();
  const [info, setInfo] = useState<RateLimitInfo | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setInfo(null);
      return;
    }

    const fetch = async () => {
      try {
        const r = await GetRateLimitInfo();
        setInfo(r);
      } catch {
        // ignore
      }
    };

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <div style={{ padding: '12px 0' }}><span style={{ color: '#7e8fa6', fontSize: 12 }}>Not connected</span></div>;
  }

  if (!info) {
    return <div style={{ padding: '12px 0' }}><span style={{ color: '#7e8fa6', fontSize: 12 }}>Loading...</span></div>;
  }

  const pct = info.limit > 0 ? (info.remaining / info.limit) * 100 : 0;
  const color = pct > 50 ? '#4caf50' : pct > 20 ? '#e0a030' : '#e05252';

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: '#7e8fa6' }}>Rate Limit</span>
        <span style={{ color, fontWeight: 500 }}>{info.remaining}/{info.limit}</span>
      </div>
      <div style={{ height: 4, background: '#e1e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}
