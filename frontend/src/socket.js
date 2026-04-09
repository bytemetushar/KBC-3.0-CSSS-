const SOCKET_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:1557' 
  : 'https://kbc-3-0-csss.onrender.com';

export const socket = io(SOCKET_URL, {
  autoConnect: false // We will connect manually upon login or loading leaderboard
});
