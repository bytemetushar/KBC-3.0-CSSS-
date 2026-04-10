import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { socket } from '../socket';
import { Code, CheckCircle, XCircle } from 'lucide-react';

export default function Contest() {
  const [questions, setQuestions] = useState([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [results, setResults] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [contestStarted, setContestStarted] = useState(false); // New state
  const [timeLeft, setTimeLeft] = useState(30);
  const [revealedAnswer, setRevealedAnswer] = useState(null);
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

    // Fetch questions
    axios.get('https://kbc-3-0-csss.onrender.com/questions').then(res => {
      setQuestions(res.data);
    });

    // Fetch participant status to restore session
    const token = localStorage.getItem('token');
    axios.get(`https://kbc-3-0-csss.onrender.com/participant/${participantId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const history = {};
      if (res.data.answers) {
        res.data.answers.forEach(ans => {
          history[ans.questionId] = {
            status: ans.status,
            scoreAdd: ans.status === 'correct' ? 10 : 0
          };
        });
      }
      setResults(history);
    }).catch(err => {
      console.error("Failed to fetch participant history", err);
      if (err.response && err.response.status === 404) {
        localStorage.removeItem('participantId');
        localStorage.removeItem('participantName');
        navigate('/');
      }
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

    // Listen for Admin's Next Question broadcast
    socket.on('question_update', (data) => {
      console.log("Admin pushed next question:", data.currentQIdx);
      setCurrentQIdx(data.currentQIdx);
      setRevealedAnswer(null);
    });

    socket.on('show_correct_answer', (data) => {
      console.log("Admin revealed answer:", data);
      setRevealedAnswer(data);
    });

    // Handle initial question index from server
    socket.on('init_active_question', (data) => {
      if (!isInitialized) {
        console.log("Setting initial contest state:", data);
        setCurrentQIdx(data.currentQIdx);
        setContestStarted(data.contestStarted);
        setIsInitialized(true);
      }
    });

    socket.on('contest_started', (data) => {
      console.log("Contest has been started by Admin!");
      setContestStarted(true);
      setCurrentQIdx(data.currentQIdx);
    });

    return () => {
      socket.off('answer_result');
      socket.off('question_update');
      socket.off('init_active_question');
      socket.off('contest_started');
      socket.off('show_correct_answer');
      socket.disconnect();
    }
  }, [participantId, navigate, isInitialized]);

  useEffect(() => {
    setSelectedOption('');
  }, [currentQIdx]);

  // Check for completion
  useEffect(() => {
    if (questions.length > 0 && results[questions[questions.length - 1]?.id]) {
       // Added a small delay for a smoother transition
       const timer = setTimeout(() => {
         navigate('/thank-you');
       }, 2000);
       return () => clearTimeout(timer);
    }
  }, [results, questions, navigate]);

  // Question Timer Logic
  useEffect(() => {
    if (!contestStarted) return; // Only run timer if contest is active

    const qId = questions[currentQIdx]?.id;
    // Only run timer if not already answered and not on completed state
    if (questions.length > 0 && !results[qId]) {
      setTimeLeft(30); // Reset timer for new question
      
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // Auto-submit on timeout
            submitAnswer("TIMEOUT");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentQIdx, questions.length, results, contestStarted]);

  const submitAnswer = (val) => {
    const currentAnswer = val === "TIMEOUT" ? "TIMEOUT" : selectedOption;
    if(currentAnswer !== "TIMEOUT" && !currentAnswer) return;
    
    const q = questions[currentQIdx];
    socket.emit('submit_answer', {
      participantId,
      questionId: q.id,
      answer: currentAnswer
    });
  };

  if(!isInitialized || questions.length === 0) return <div style={{textAlign:'center', marginTop:'5rem', color: 'var(--primary)'}}>Initialising session...</div>;

  if (!contestStarted) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '10vh auto', textAlign: 'center' }}>
        <div className="neo-panel" style={{ padding: '4rem 2rem' }}>
          <div className="loader-container" style={{ marginBottom: '2rem' }}>
            <div className="pulse-ring"></div>
            <Code size={48} color="var(--primary)" className="animate-pulse" />
          </div>
          <h1 style={{ color: 'var(--primary)', letterSpacing: '2px', marginBottom: '1rem' }}>WAITING FOR HOST</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '2rem' }}>
            Get ready {participantName}! The contest will begin shortly.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', opacity: 0.6 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{questions.length}</div>
              <small>QUESTIONS</small>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>30s</div>
              <small>PER Q</small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentQIdx];
  const qResult = results[q.id];
  const isRevealedForCurrent = revealedAnswer && q && revealedAnswer.questionId === q.id;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>KBC: Round 1</h2>
          <span style={{ color: 'var(--text-muted)' }}>Participant: {participantName}</span>
        </div>
        <div className="neo-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '1rem', borderRight: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>TIME:</span>
              <strong style={{ 
                color: timeLeft <= 10 ? 'var(--danger)' : 'var(--primary)', 
                fontSize: '1.2rem',
                minWidth: '2ch',
                textAlign: 'right',
                animation: timeLeft <= 5 ? 'pulse 0.5s infinite' : 'none'
              }}>
                {timeLeft}s
              </strong>
           </div>
           <div>
            <span>Score:</span> 
            <strong style={{ color: 'var(--secondary)', fontSize: '1.2rem', marginLeft: '0.5rem' }}>
              {Object.values(results).reduce((acc, curr) => acc + (curr.scoreAdd || 0), 0)}
            </strong>
           </div>
        </div>
      </header>

      <div className="neo-panel" style={{ overflow: 'hidden', position: 'relative' }}>
        {/* Timer Progress Bar */}
        {!qResult && (
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            height: '4px', 
            background: timeLeft <= 10 ? 'var(--danger)' : 'var(--primary)',
            width: `${(timeLeft / 30) * 100}%`,
            transition: 'width 1s linear, background 0.3s'
          }} />
        )}
        
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
            {isRevealedForCurrent && (
              <div style={{
                padding: '1.5rem',
                marginBottom: '1.5rem',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid var(--success)',
                color: 'var(--success)',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                animation: 'fade-in 0.5s ease-out'
              }}>
                <CheckCircle size={24} />
                Correct Answer: {revealedAnswer.correctAnswer}
              </div>
            )}
            
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
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  {q.options && q.options.map((opt, idx) => {
                    const isSelected = selectedOption === opt;
                    return (
                      <button 
                        key={idx}
                        className="neo-button"
                        style={{ 
                          textAlign: 'left', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '1rem',
                          height: 'auto',
                          padding: '1.25rem',
                          background: isSelected ? 'rgba(0, 255, 204, 0.15)' : 'transparent',
                          borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => setSelectedOption(opt)}
                      >
                        <span style={{ 
                          background: isSelected ? 'var(--primary)' : 'rgba(0,255,204,0.1)', 
                          color: isSelected ? '#000' : 'var(--primary)', 
                          width: '24px', 
                          height: '24px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: isSelected ? 'bold' : 'normal',
                          transition: 'all 0.2s ease'
                        }}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button 
                    className="neo-button" 
                    style={{ background: 'var(--primary)', color: '#000', padding: '1rem 3rem', fontSize: '1.1rem' }}
                    onClick={() => submitAnswer()}
                    disabled={!selectedOption}
                  >
                    SUBMIT ANSWER
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
           <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
             Waiting for admin to push the next question...
           </p>
        </div>
      </div>
    </div>
  );
}
