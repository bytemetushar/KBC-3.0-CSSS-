import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Contest from './pages/Contest';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';
import ThankYou from './pages/ThankYou';

function App() {
  return (
    <Router>
      <div className="app-container" style={{ padding: '2rem' }}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/contest" element={<Contest />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/thank-you" element={<ThankYou />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
