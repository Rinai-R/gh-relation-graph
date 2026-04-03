import { useGraphContext } from '../context/GraphContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#4a90d9', '#7c6dd8', '#e0a030', '#e05252', '#4caf50', '#26b0c4'];

export function ChartView() {
  const { state } = useGraphContext();

  if (!state.stats || !state.graph) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#7e8fa6',
        fontSize: 14,
      }}>
        Explore a user to see statistics
      </div>
    );
  }

  const { stats } = state;

  // Prepare data
  const depthData = Object.entries(stats.nodesByDepth)
    .map(([depth, count]) => ({ depth: `Depth ${depth}`, count }))
    .sort((a, b) => a.depth.localeCompare(b.depth));

  const pieData = [
    { name: 'Mutual Follows', value: stats.mutualFollows },
    { name: 'One-way', value: stats.totalEdges - stats.mutualFollows * 2 },
  ];

  const topFollowed = (stats.topFollowed || []).slice(0, 10).map((u) => ({
    name: u.login,
    value: u.followers,
  }));

  const topFollowing = (stats.topFollowing || []).slice(0, 10).map((u) => ({
    name: u.login,
    value: u.following,
  }));

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 10,
    padding: '12px 16px',
    boxShadow: '0 1px 4px rgba(44, 62, 80, 0.06)',
    textAlign: 'center',
    border: '1px solid #e1e8f0',
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 20 }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#4a90d9' }}>{stats.totalNodes}</div>
          <div style={{ fontSize: 11, color: '#7e8fa6' }}>Total Nodes</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#7c6dd8' }}>{stats.totalEdges}</div>
          <div style={{ fontSize: 11, color: '#7e8fa6' }}>Total Edges</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#4caf50' }}>{stats.mutualFollows}</div>
          <div style={{ fontSize: 11, color: '#7e8fa6' }}>Mutual Follows</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#e0a030' }}>{stats.avgFollowers.toFixed(0)}</div>
          <div style={{ fontSize: 11, color: '#7e8fa6' }}>Avg Followers</div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Nodes by Depth */}
        <div style={{ ...cardStyle, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2c3e50', marginBottom: 12 }}>
            Nodes by Depth
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={depthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e8f0" />
              <XAxis dataKey="depth" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {depthData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mutual vs One-way */}
        <div style={{ ...cardStyle, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2c3e50', marginBottom: 12 }}>
            Follow Types
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label>
                <Cell fill="#4caf50" />
                <Cell fill="#b0c4d8" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top Followed */}
        <div style={{ ...cardStyle, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2c3e50', marginBottom: 12 }}>
            Top 10 Most Followed
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topFollowed} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e8f0" />
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="name" width={100} fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill="#4a90d9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Following */}
        <div style={{ ...cardStyle, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2c3e50', marginBottom: 12 }}>
            Top 10 Most Following
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topFollowing} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e1e8f0" />
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="name" width={100} fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" fill="#7c6dd8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
