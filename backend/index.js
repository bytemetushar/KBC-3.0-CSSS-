const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const Participant = require('./models/Participant');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const ADMIN_KEY = process.env.Admin_key || 'KBC_ADMIN_DEFAULT';

let currentActiveQuestionIndex = 0; // Global state for common question progression
let questionStartedAt = Date.now(); // Global timestamp for current question start

mongoose.connect(process.env.Mongo_url || process.env.mongo_url)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://kbc-3-0-csss.vercel.app',
    methods: ['GET', 'POST']
  }
});

const db = new sqlite3.Database('./kbc.db');

db.serialize(() => {
  // We keep answers in SQLite
  db.run("CREATE TABLE IF NOT EXISTS answers (participantId TEXT, questionId TEXT, status TEXT)"); 
});

const questions = [
  { id: 'q1', title: 'Find the Bug', type: 'bug', code: 'function add(a, b) {\n  return a - b; // Should be addition\n}', correctAnswer: '+' },
  { id: 'q2', title: 'Predict Output', type: 'output', code: 'console.log(typeof null);', correctAnswer: 'object' },
  { id: 'q3', title: 'Find the Bug', type: 'bug', code: 'let x = 10;\nif (x = 5) {\n  console.log("x is 5");\n}', correctAnswer: '==' },
  { id: 'q4', title: 'Predict Output', type: 'output', code: 'console.log(0.1 + 0.2 === 0.3);', correctAnswer: 'false' },
];

app.post('/register', async (req, res) => {
  const { id, name } = req.body;
  if(!id || !name) return res.status(400).json({ error: 'Missing id or name' });
  
  try {
    let participant = await Participant.findOne({ id });
    if (!participant) {
      participant = new Participant({ id, name });
      await participant.save();
    }
    
    // Generate JWT Token
    const token = jwt.sign({ id: participant.id, name: participant.name }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ success: true, token, id: participant.id, name: participant.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admin/verify', (req, res) => {
  const { key } = req.body;
  if (key === ADMIN_KEY) {
    res.json({ success: true, message: 'Admin verified' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid admin key' });
  }
});

app.get('/admin/export-report', async (req, res) => {
  const { key } = req.query;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin key' });
  }

  try {
    const participants = await Participant.find().sort({ score: -1, totalTimeTaken: 1 });
    
    // Process data for Excel
    const reportData = participants.map((p, index) => {
      // Format answers as a descriptive string
      const answerSummary = p.answers.map(a => `${a.questionId}: ${a.answer} (${a.status})`).join(' | ');
      const submissionTimeSummary = p.answers.map(a => `${a.questionId}: ${a.timeTaken}s`).join(' | ');

      return {
        'Rank': index + 1,
        'Team ID': p.id,
        'Name': p.name,
        'Total Score': p.score,
        'Answers Summary': answerSummary,
        'Individual Submission Times': submissionTimeSummary,
        'Total Time Taken (s)': p.totalTimeTaken.toFixed(2),
        'Registration Date': p.createdAt.toLocaleString()
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Leaderboard Results');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="KBC_Contest_Report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/questions', (req, res) => {
  // Exclude correct answer when sending to client
  const clientQuestions = questions.map(q => ({ id: q.id, title: q.title, type: q.type, code: q.code }));
  res.json(clientQuestions);
});

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

app.get('/leaderboard', async (req, res) => {
  try {
    const participants = await Participant.find().sort({ score: -1, totalTimeTaken: 1 });
    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/participant/:id', authMiddleware, async (req, res) => {
  try {
    // Ensure participant can only access their own data
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own data' });
    }

    const participant = await Participant.findOne({ id: req.params.id });
    if (!participant) return res.status(404).json({ error: 'Participant not found' });
    res.json(participant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('submit_answer', async ({ participantId, questionId, answer }) => {
    console.log(`Submission received: Participant=${participantId}, Question=${questionId}, Answer="${answer}"`);
    const q = questions.find(q => q.id === questionId);
    if (!q) {
      console.log(`Question ${questionId} not found`);
      return;
    }

    try {
      const participant = await Participant.findOne({ id: participantId });
      if(!participant) {
        console.log(`Participant ${participantId} not found in MongoDB`);
        return;
      }

      // Check if already answered in SQLite using a Promise
      const checkAnswer = () => {
        return new Promise((resolve, reject) => {
          db.get("SELECT * FROM answers WHERE participantId = ? AND questionId = ?", [participantId, questionId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      };

      const existingAnswer = await checkAnswer();
      const isTimeout = answer === "TIMEOUT";
      const isCorrect = !isTimeout && q.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
      const status = isCorrect ? 'correct' : 'wrong';

      if (!existingAnswer) {
        console.log(`New answer for ${participantId}/${questionId}. Recording...`);
        
        // Calculate time taken
        const timeTaken = Math.min(30, Number(((Date.now() - questionStartedAt) / 1000).toFixed(2)));

        // Record in SQLite
        db.run("INSERT INTO answers (participantId, questionId, status) VALUES (?, ?, ?)", [participantId, questionId, status]);

        // Record in MongoDB array
        participant.answers.push({ questionId, answer, status, timeTaken });
        participant.totalTimeTaken += timeTaken;

        let scoreAdd = 0;
        let reason = '';
        if (isCorrect) {
          participant.score += 10;
          scoreAdd = 10;
          console.log(`Adding 10 points. New score: ${participant.score}`);
        } else {
          reason = isTimeout ? 'Timed Out! No answer submitted.' : 'Incorrect answer. Try better next time!';
        }
        
        await participant.save();
        console.log("Participant saved to MongoDB");

        if (isCorrect) {
          // Broadcast leaderboard update
          const updatedLeaderboard = await Participant.find().sort({ score: -1, totalTimeTaken: 1 });
          io.emit('leaderboard_update', updatedLeaderboard);
        }
        
        socket.emit('answer_result', { questionId, status, correct: isCorrect, scoreAdd, reason });
      } else {
        console.log(`Participant already answered ${questionId}. Status in DB: ${existingAnswer.status}`);
        socket.emit('answer_result', { 
          questionId, 
          status: existingAnswer.status, 
          correct: false, 
          scoreAdd: existingAnswer.status === 'correct' ? 10 : 0, 
          reason: 'You have already answered this question.' 
        });
      }
    } catch (err) {
      console.error("Socket error handler:", err);
      socket.emit('answer_result', { error: 'An internal error occurred. Please try again.' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  // Admin control: Next question
  socket.on('admin_next_question', ({ key }) => {
    if (key === ADMIN_KEY) {
      if (currentActiveQuestionIndex < questions.length - 1) {
        currentActiveQuestionIndex++;
        questionStartedAt = Date.now(); // Reset question timer
        console.log(`Admin progressed to question index ${currentActiveQuestionIndex}`);
        io.emit('question_update', { currentQIdx: currentActiveQuestionIndex });
      }
    }
  });

  // Sync request for new/refreshing participants
  socket.emit('init_active_question', { currentQIdx: currentActiveQuestionIndex });
});

const PORT = process.env.PORT || 1557;
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
