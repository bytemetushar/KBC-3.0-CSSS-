import { useState, useEffect } from 'react';
import axios from 'axios';
import { socket } from '../socket';
import { Terminal, Lock, ChevronRight, Activity, Users, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [questions, setQuestions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const storedKey = localStorage.getItem('adminKey');
    if (storedKey) {
      verifyKey(storedKey);
    }

    axios.get('http://localhost:1557/questions').then(res => {
      setQuestions(res.data);
    });

    socket.connect();
    socket.on('init_active_question', (data) => {
      setCurrentQIdx(data.currentQIdx);
    });

    socket.on('question_update', (data) => {
      setCurrentQIdx(data.currentQIdx);
    });

    return () => {
      socket.off('init_active_question');
      socket.off('question_update');
    };
  }, []);

  const verifyKey = async (inputKey) => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:1557/admin/verify', { key: inputKey });
      if (res.data.success) {
        setIsAdmin(true);
        localStorage.setItem('adminKey', inputKey);
        setError('');
      }
    } catch (err) {
      setError('Invalid entry key. Access denied.');
      localStorage.removeItem('adminKey');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    const adminKey = localStorage.getItem('adminKey');
    socket.emit('admin_next_question', { key: adminKey });
  };

  const handleLogout = () => {
    localStorage.removeItem('adminKey');
    setIsAdmin(false);
    navigate('/admin');
  };

  if (!isAdmin) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '450px', margin: '10vh auto' }}>
        <div className="neo-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Lock size={64} color="var(--primary)" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
          <h1 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', letterSpacing: '3px', textTransform: 'uppercase' }}>
            Admin Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Enter command key to access control</p>
          
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <input 
              type="password" 
              className="neo-input" 
              placeholder="ENTRY KEY"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verifyKey(key)}
              style={{ paddingLeft: '3rem', letterSpacing: '4px' }}
            />
            <Terminal size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>}

          <button 
            className="neo-button" 
            style={{ width: '100%' }}
            onClick={() => verifyKey(key)}
            disabled={loading}
          >
            {loading ? 'VERIFYING...' : 'ACCESS CONTROL'}
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIdx];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '2rem auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
             <Activity color="#000" size={24} />
          </div>
          <h2 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>Control Dashboard</h2>
        </div>
        <button onClick={handleLogout} className="neo-button" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
          <LogOut size={18} />
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        <div className="neo-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <Terminal color="var(--primary)" />
            <h3 style={{ margin: 0 }}>Active Question State</h3>
          </div>

          {currentQ && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Q{currentQIdx + 1} / {questions.length}</span>
                <span style={{ opacity: 0.5 }}>ID: {currentQ.id}</span>
              </div>
              <h4 style={{ fontSize: '1.2rem', margin: '0 0 1rem 0' }}>{currentQ.title}</h4>
              <pre style={{ background: '#000', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', color: '#888' }}>
                <code>{currentQ.code}</code>
              </pre>
            </div>
          )}

          <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
            <button 
              className="neo-button" 
              style={{ height: 'auto', padding: '1.5rem 3rem', fontSize: '1.2rem', background: 'var(--secondary)', color: '#000' }}
              onClick={handleNextQuestion}
              disabled={currentQIdx >= questions.length - 1}
            >
              PUSH NEXT QUESTION <ChevronRight style={{ marginLeft: '1rem' }} />
            </button>
            <p style={{ marginTop: '1rem', opacity: 0.5, fontSize: '0.9rem' }}>
              Broadcasting to all connected participants
            </p>
          </div>
        </div>

        <div className="neo-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Users size={20} color="var(--primary)" />
            <h4 style={{ margin: 0 }}>Game Stats</h4>
          </div>
          
          <div className="stat-card" style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(0,255,204,0.05)', borderRadius: '8px' }}>
             <small style={{ opacity: 0.6 }}>Active Question</small>
             <div style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{currentQIdx + 1}</div>
          </div>

          <div className="stat-card" style={{ padding: '1rem', background: 'rgba(0,255,204,0.05)', borderRadius: '8px' }}>
             <small style={{ opacity: 0.6 }}>Total Questions</small>
             <div style={{ fontSize: '1.5rem' }}>{questions.length}</div>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px dashed #444' }}>
              <p style={{ fontSize: '0.8rem', margin: '0 0 1rem 0', opacity: 0.7 }}>
                <strong>Note:</strong> Participants will remain on the current question until you push the next one.
              </p>
              <a 
                href={`http://localhost:1557/admin/export-report?key=${localStorage.getItem('adminKey')}`}
                download
                className="neo-button"
                style={{ width: '100%', fontSize: '0.8rem', background: 'var(--primary)', color: '#000', textAlign: 'center', textDecoration: 'none', display: 'block' }}
              >
                DOWNLOAD EXCEL REPORT
              </a>
          </div>
        </div>
      </div>
    </div>
  );
}
