import { io } from 'socket.io-client';

// 'http://localhost:3001' is our backend server
// export const socket = io('http://localhost:1557', {
//   autoConnect: false // We will connect manually upon login or loading leaderboard
// });
export const socket = io('https://kbc-3-0-csss.onrender.com', {
  autoConnect: false // We will connect manually upon login or loading leaderboard
});
