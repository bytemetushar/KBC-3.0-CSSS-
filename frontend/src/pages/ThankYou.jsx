import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Home, Award, BarChart3, Star } from 'lucide-react';
import axios from 'axios';

export default function ThankYou() {
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const participantId = localStorage.getItem('participantId');
  const participantName = localStorage.getItem('participantName');

  useEffect(() => {
    if (!participantId) {
      navigate('/');
      return;
    }

    // Fetch final score one last time
    const token = localStorage.getItem('token');
    axios.get(`https://kbc-3-0-csss.onrender.com/participant/${participantId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setScore(res.data.score);
    }).catch(err => {
      console.error("Failed to fetch final score", err);
    });
    // axios.get(`http://localhost:1557/participant/${participantId}`, {
    //   headers: { Authorization: `Bearer ${token}` }
    // }).then(res => {
    //   setScore(res.data.score);
    // }).catch(err => {
    //   console.error("Failed to fetch final score", err);
    // });
  }, [participantId, navigate]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '10vh auto', textAlign: 'center' }}>
      <div className="neo-panel" style={{ padding: '4rem 2rem', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
           <Trophy size={150} color="var(--primary)" />
        </div>
        
        <div style={{ 
          background: 'var(--primary)', 
          width: '100px', 
          height: '100px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 2rem auto',
          boxShadow: '0 0 30px var(--primary-glow)'
        }}>
           <Award size={50} color="#000" />
        </div>

        <h1 style={{ color: 'var(--primary)', margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '4px' }}>
          Mission Complete
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '2rem' }}>
          Thank you for participating in Kaun Banega Coder 3.0
        </p>

        <div style={{ 
          background: 'rgba(0,0,0,0.3)', 
          padding: '2rem', 
          borderRadius: '16px', 
          border: '1px solid var(--border-color)',
          display: 'inline-block',
          minWidth: '250px',
          marginBottom: '3rem'
        }}>
           <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2px', opacity: 0.6, marginBottom: '0.5rem' }}>
             Final Merit Score
           </div>
           <div style={{ fontSize: '3.5rem', fontWeight: '900', color: 'var(--secondary)', textShadow: '0 0 20px rgba(255, 204, 0, 0.3)' }}>
             {score}
           </div>
           <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} color="var(--secondary)" fill="var(--secondary)" style={{ opacity: i <= (score / 20) ? 1 : 0.2 }} />)}
           </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="neo-button" onClick={() => navigate('/leaderboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} /> VIEW RANKINGS
          </button>
          <button className="neo-button" onClick={() => navigate('/')} style={{ background: 'transparent', border: '1px solid var(--border-color)' }}>
            <Home size={20} />
          </button>
        </div>
      </div>
      
      <p style={{ marginTop: '2rem', opacity: 0.4, fontSize: '0.9rem' }}>
        Participant: {participantName} {participantId && `(ID: ${participantId})`}
      </p>
    </div>
  );
}
