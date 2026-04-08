import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { socket } from '../socket';
import { Code, CheckCircle, XCircle } from 'lucide-react';

export default function Contest() {
  const [questions, setQuestions] = useState([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState({});
  const navigate = useNavigate();

  const participantId = localStorage.getItem('participantId');
  const participantName = localStorage.getItem('participantName');

  useEffect(() => {
    if(!participantId) {
      navigate('/');
      return;
    }

    // Connect socket
    socket.connect();

    axios.get('http://localhost:3001/questions').then(res => {
      setQuestions(res.data);
    });

    socket.on('answer_result', (data) => {
      setResults(prev => ({
        ...prev,
        [data.questionId]: {
          status: data.status,
          scoreAdd: data.scoreAdd,
          reason: data.reason
        }
      }));
    });

    return () => {
      socket.off('answer_result');
      socket.disconnect();
    }
  }, [participantId, navigate]);

  const submitAnswer = () => {
    if(!answer.trim()) return;
    const q = questions[currentQIdx];
    socket.emit('submit_answer', {
      participantId,
      questionId: q.id,
      answer
    });
    setAnswer('');
  };

  const nextQuestion = () => {
    if(currentQIdx < questions.length - 1) {
      setCurrentQIdx(prev => prev + 1);
    }
  };

  if(questions.length === 0) return <div style={{textAlign:'center', marginTop:'5rem'}}>Loading questions...</div>;

  const q = questions[currentQIdx];
  const qResult = results[q.id];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>KBC: Round 1</h2>
          <span style={{ color: 'var(--text-muted)' }}>Participant: {participantName}</span>
        </div>
        <div className="neo-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
           <span>Score:</span> 
           <strong style={{ color: 'var(--secondary)', fontSize: '1.2rem' }}>
             {Object.values(results).reduce((acc, curr) => acc + (curr.scoreAdd || 0), 0)}
           </strong>
        </div>
      </header>

      <div className="neo-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)' }}>
          <Code color="var(--primary)" />
          <h3 style={{ margin: 0 }}>Question {currentQIdx + 1} of {questions.length}: {q.title}</h3>
          <span style={{ marginLeft: 'auto', background: 'rgba(0,255,204,0.1)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'uppercase' }}>
            {q.type}
          </span>
        </div>
        
        <div style={{ padding: '2rem' }}>
          <pre style={{ background: '#000', padding: '1rem', borderRadius: '8px', border: '1px solid #333', overflowX: 'auto', fontSize: '1.1rem', color: '#a6accd' }}>
            <code>{q.code}</code>
          </pre>

          <div style={{ marginTop: '2rem' }}>
            {qResult ? (
              <div style={{ 
                padding: '1.5rem', 
                borderRadius: '8px', 
                background: qResult.status === 'correct' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${qResult.status === 'correct' ? 'var(--success)' : 'var(--danger)'}`,
                display: 'flex', alignItems: 'center', gap: '1rem'
              }}>
                {qResult.status === 'correct' ? <CheckCircle color="var(--success)" size={32} /> : <XCircle color="var(--danger)" size={32} />}
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: qResult.status === 'correct' ? 'var(--success)' : 'var(--danger)' }}>
                    {qResult.status === 'correct' ? 'Correct Answer!' : 'Incorrect'}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    {qResult.status === 'correct' ? `+${qResult.scoreAdd} points` : qResult.reason}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  className="neo-input" 
                  placeholder={q.type === 'bug' ? 'Enter the fixed code snippet / operator' : 'Enter predicted output'}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                />
                <button className="neo-button" onClick={submitAnswer}>Submit</button>
              </div>
            )}
          </div>
        </div>
        
        <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.2)' }}>
           <button 
             className="neo-button" 
             onClick={nextQuestion} 
             disabled={currentQIdx >= questions.length - 1}
           >
             Next Question
           </button>
        </div>
      </div>
    </div>
  );
}
