import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Shield, Terminal } from 'lucide-react';

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:1557' 
  : 'https://kbc-3-0-csss.onrender.com';

export default function Login() {
  const [teamId, setTeamId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if(!teamId || !teamName) return;
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, { id: teamId, name: teamName });
      // const response = await axios.post('http://localhost:1557/register', { id: teamId, name: teamName });
      const { token } = response.data;
      localStorage.setItem('participantId', teamId);
      localStorage.setItem('participantName', teamName);
      localStorage.setItem('token', token);
      navigate('/contest');
    } catch(err) {
      alert("Error connecting to server. Is it running?");
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div className="neo-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <Terminal size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
        <h1 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px' }}>
          Kaun Banega Coder 3.0
        </h1>
        <p style={{ margin: '0 0 2rem 0', color: 'var(--text-muted)' }}>Round 1: Code Chronicles</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="Roll Number / Team ID" 
            className="neo-input" 
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            required
          />
          <input 
            type="text" 
            placeholder="Name / Team Name" 
            className="neo-input" 
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />
          <button type="submit" className="neo-button" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Initializing...' : 'Enter System'}
          </button>
        </form>
      </div>
    </div>
  );
}
