const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const db = new sqlite3.Database('./kbc.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS participants (id TEXT PRIMARY KEY, name TEXT, score INTEGER DEFAULT 0)");
  db.run("CREATE TABLE IF NOT EXISTS answers (participantId TEXT, questionId TEXT, status TEXT)"); 
});

const questions = [
  { id: 'q1', title: 'Find the Bug', type: 'bug', code: 'function add(a, b) {\n  return a - b; // Should be addition\n}', correctAnswer: '+' },
  { id: 'q2', title: 'Predict Output', type: 'output', code: 'console.log(typeof null);', correctAnswer: 'object' },
  { id: 'q3', title: 'Find the Bug', type: 'bug', code: 'let x = 10;\nif (x = 5) {\n  console.log("x is 5");\n}', correctAnswer: '==' },
  { id: 'q4', title: 'Predict Output', type: 'output', code: 'console.log(0.1 + 0.2 === 0.3);', correctAnswer: 'false' },
];

app.post('/register', (req, res) => {
  const { id, name } = req.body;
  if(!id || !name) return res.status(400).json({ error: 'Missing id or name' });
  db.run("INSERT OR IGNORE INTO participants (id, name, score) VALUES (?, ?, 0)", [id, name], (err) => {
    if(err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id, name });
  });
});

app.get('/questions', (req, res) => {
  // Exclude correct answer when sending to client
  const clientQuestions = questions.map(q => ({ id: q.id, title: q.title, type: q.type, code: q.code }));
  res.json(clientQuestions);
});

app.get('/leaderboard', (req, res) => {
  db.all("SELECT id, name, score FROM participants ORDER BY score DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('submit_answer', ({ participantId, questionId, answer }) => {
    const q = questions.find(q => q.id === questionId);
    if (!q) return;

    db.get("SELECT score FROM participants WHERE id = ?", [participantId], (err, row) => {
      if(err || !row) return;

      const isCorrect = q.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
      const status = isCorrect ? 'correct' : 'incorrect';
      
      // We shouldn't let them answer multiple times for points but for simplicity we will just add score if it's new
      db.get("SELECT * FROM answers WHERE participantId = ? AND questionId = ?", [participantId, questionId], (err, answerRow) => {
        if (!answerRow && isCorrect) {
          db.run("UPDATE participants SET score = score + 10 WHERE id = ?", [participantId], () => {
             // Record this answer
            db.run("INSERT INTO answers (participantId, questionId, status) VALUES (?, ?, ?)", [participantId, questionId, status]);
            // Broadcast leaderboard update
            db.all("SELECT id, name, score FROM participants ORDER BY score DESC", [], (err, rows) => {
              io.emit('leaderboard_update', rows);
            });
            socket.emit('answer_result', { questionId, status, correct: true, scoreAdd: 10 });
          });
        } else {
           socket.emit('answer_result', { questionId, status, correct: false, scoreAdd: 0, reason: answerRow ? 'Already answered correctly' : 'Incorrect answer' });
        }
      });
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
