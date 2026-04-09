import { useState, useEffect } from 'react';
import axios from 'axios';
import { socket } from '../socket';
import { Trophy, Medal, Award, ArrowLeft, RefreshCw } from 'lucide-react';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:1557' 
  : 'https://kbc-3-0-csss.onrender.com';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    // Initial fetch
    axios.get(`${API_BASE_URL}/leaderboard`).then(res => {
      setLeaders(res.data);
    });
    // axios.get('http://localhost:1557/leaderboard').then(res => {
    //   setLeaders(res.data);
    // });

    socket.connect();
    socket.on('leaderboard_update', (data) => {
      setLeaders(data);
    });

    return () => {
      socket.off('leaderboard_update');
      socket.disconnect();
    }
  }, []);

  const getRankIcon = (index) => {
    if(index === 0) return <Trophy color="var(--secondary)" size={28} />;
    if(index === 1) return <Medal color="#94a3b8" size={28} />;
    if(index === 2) return <Award color="#b45309" size={28} />;
    return <span style={{ width: '28px', display: 'inline-block', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>{index + 1}</span>;
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '2rem auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0', color: 'var(--primary)', textTransform: 'uppercase', textShadow: '0 0 20px rgba(0, 255, 204, 0.4)' }}>
          Live Leaderboard
        </h1>
        <div style={{ display: 'inline-block', padding: '0.5rem 2rem', border: '1px solid var(--border-color)', borderRadius: '20px', background: 'rgba(0,0,0,0.5)', color: 'var(--secondary)', letterSpacing: '2px' }}>
          KBC 3.0 • ROUND 1
        </div>
      </header>

      <div className="neo-panel" style={{ padding: '0.5rem' }}>
        {leaders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No participants yet. Waiting for heroes to emerge...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {leaders.map((u, i) => (
              <div 
                key={u.id} 
                className="leaderboard-row"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '1.25rem 2rem', 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: '6px' 
                }}
              >
                <div style={{ width: '60px', display: 'flex', justifyContent: 'center' }}>
                  {getRankIcon(i)}
                </div>
                <div style={{ flex: 1, fontSize: '1.2rem', fontWeight: i < 3 ? 'bold' : 'normal', color: i === 0 ? 'var(--secondary)' : 'var(--text-main)' }}>
                  {u.name} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '1rem', fontWeight: 'normal' }}>#{u.id}</span>
                </div>
                <div style={{ marginRight: '2rem', textAlign: 'right' }}>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Time</div>
                   <div style={{ fontSize: '1rem', color: '#888' }}>{u.totalTimeTaken.toFixed(2)}s</div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)', textAlign: 'right', minWidth: '80px' }}>
                  {u.score}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
