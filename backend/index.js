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
let contestStarted = false; // Add state for contest status

mongoose.connect(process.env.Mongo_url || process.env.mongo_url)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://kbc-3-0-csss.vercel.app', 'http://localhost:5173'], // Added localhost for testing
    methods: ['GET', 'POST']
  }
});

const db = new sqlite3.Database('./kbc.db');

db.serialize(() => {
  // We keep answers in SQLite
  db.run("CREATE TABLE IF NOT EXISTS answers (participantId TEXT, questionId TEXT, status TEXT)"); 
});

const questions = [

/* ================= EASY LEVEL ================= */

{
  id: 'q1',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  printf("%d", 2+3*2);\n  return 0;\n}',
  options: ['10', '8', '7', '12'],
  correctAnswer: '8'
},
{
  id: 'q2',
  title: 'Find the Bug',
  type: 'bug',
  code: '#include <stdio.h>\nint main() {\n  int a = 5;\n  printf("%f", a);\n  return 0;\n}',
  options: ['%d', '%c', '%p', '%s'],
  correctAnswer: '%d'
},
{
  id: 'q3',
  title: 'Concept Check',
  type: 'concept',
  code: '#include <stdio.h>\nint main() {\n  int a = 5;\n  printf("%d", sizeof(a));\n  return 0;\n}',
  options: ['2', '4', 'Depends on compiler', '8'],
  correctAnswer: 'Depends on compiler'
},
{
  id: 'q4',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  int a = 5;\n  printf("%d", a++);\n  return 0;\n}',
  options: ['6', '5', 'Error', 'Undefined'],
  correctAnswer: '5'
},

/* ================= MEDIUM LEVEL ================= */

{
  id: 'm1',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  printf("%d", printf("Hi"));\n  return 0;\n}',
  options: ['Hi2', '2Hi', 'Hi', 'Error'],
  correctAnswer: 'Hi2'
},
{
  id: 'm2',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  int a = 5;\n  printf("%d", ++a);\n  return 0;\n}',
  options: ['5', '6', 'Error', 'Undefined'],
  correctAnswer: '6'
},
{
  id: 'm3',
  title: 'Find the Bug',
  type: 'bug',
  code: '#include <stdio.h>\nint main() {\n  int arr[3] = {1,2,3};\n  printf("%d", arr[3]);\n  return 0;\n}',
  options: ['Index out of bounds', 'Syntax error', 'No error', 'Logic error'],
  correctAnswer: 'Index out of bounds'
},
{
  id: 'm4',
  title: 'Concept Check',
  type: 'concept',
  code: '#include <stdio.h>\nint main() {\n  int x = 5;\n  printf("%d", sizeof(x++));\n  return 0;\n}',
  options: ['x becomes 6', 'x becomes 5', 'Error', 'Undefined'],
  correctAnswer: 'x becomes 5'
},

{
  id: 'm5',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  int a = 5;\n  int *p = &a;\n  printf("%d", *p);\n  return 0;\n}',
  options: ['5', 'Address', 'Garbage', 'Error'],
  correctAnswer: '5'
},
{
  id: 'm6',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  int a = -1;\n  printf("%u", a);\n  return 0;\n}',
  options: ['-1', '0', 'Large positive number', 'Error'],
  correctAnswer: 'Large positive number'
},
{
  id: 'm7',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  int a = 5;\n  printf("%d", a << 1);\n  return 0;\n}',
  options: ['10', '5', '2', 'Error'],
  correctAnswer: '10'
},
{
   id: 'm8',
  title: 'Find the Bug',
  type: 'bug',
  code: '#include <stdio.h>\nint main() {\n  int *p;\n  printf("%d", *p);\n  return 0;\n}',
  options: ['Uninitialized pointer', 'Syntax error', 'No error', 'Logic error'],
  correctAnswer: 'Uninitialized pointer'
},

{
  id: 'e9',
  title: 'Find the Bug',
  type: 'bug',
  code: '#include <stdio.h>\nvoid main() {\n  printf("Hello");\n}',
  options: ['Return type issue', 'Syntax error', 'No error', 'Logic error'],
  correctAnswer: 'Return type issue'
},
{
  id: 'cx8',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  int i=5,j=1;\n  for(i=5;i>0;i--){\n    j+=i;\n  }\n  printf("%d",j);\n  return 0;\n}',
  options: ['16', '15', '11', 'Error'],
  correctAnswer: '16'
},
{
  id: 'e4',
  title: 'Concept Check',
  type: 'concept',
  code: '#include <stdio.h>\nint main() {\n  int a;\n  printf("%d", a);\n  return 0;\n}',
  options: ['0', 'Garbage value', 'Error', '5'],
  correctAnswer: 'Garbage value'
},
{
  id: 'e5',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  printf("%d", 5 * 2);\n  return 0;\n}',
  options: ['10', '7', '25', '5'],
  correctAnswer: '10'
},
{
  id: 'e6',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  int a = 5;\n  printf("%d", a++);\n  return 0;\n}',
  options: ['6', '5', 'Error', '0'],
  correctAnswer: '5'
},
{
  id: 'e7',
  title: 'Concept Check',
  type: 'concept',
  code: '#include <stdio.h>\nint main() {\n  printf("%lu", sizeof(int));\n  return 0;\n}',
  options: ['2', '4', 'Depends on system', '8'],
  correctAnswer: 'Depends on system'
},
{
  id: 'e8',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  int a = 10;\n  printf("%d", a - 3);\n  return 0;\n}',
  options: ['7', '13', '10', '3'],
  correctAnswer: '7'
},
{
  id: 'cx12',
  title: 'Predict Output',
  type: 'output',
  code: '#include <stdio.h>\nint main() {\n  int a=1,b=2,c=3;\n  a += b *= c -= 1;\n  printf("%d %d %d",a,b,c);\n  return 0;\n}',
  options: ['5 4 2', '3 2 1', '7 4 2', 'Error'],
  correctAnswer: '5 4 2'
},


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
  const clientQuestions = questions.map(q => ({ id: q.id, title: q.title, type: q.type, code: q.code, options: q.options }));
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
    if (!contestStarted) return; // Prevent submissions if contest hasn't started

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

  // Admin control: Start contest
  socket.on('admin_start_contest', ({ key }) => {
    if (key === ADMIN_KEY && !contestStarted) {
      contestStarted = true;
      questionStartedAt = Date.now();
      console.log('Admin started the contest');
      io.emit('contest_started', { currentQIdx: currentActiveQuestionIndex });
    }
  });

  // Admin control: Next question
  socket.on('admin_next_question', ({ key }) => {
    if (key === ADMIN_KEY && contestStarted) {
      if (currentActiveQuestionIndex < questions.length - 1) {
        currentActiveQuestionIndex++;
        questionStartedAt = Date.now(); // Reset question timer
        console.log(`Admin progressed to question index ${currentActiveQuestionIndex}`);
        io.emit('question_update', { currentQIdx: currentActiveQuestionIndex });
      }
    }
  });

  // Sync request for new/refreshing participants
  socket.emit('init_active_question', { 
    currentQIdx: currentActiveQuestionIndex,
    contestStarted: contestStarted 
  });
});

const PORT = process.env.PORT || 1557;
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
