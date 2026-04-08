import { io } from 'socket.io-client';

// 'http://localhost:3001' is our backend server
export const socket = io('http://localhost:3001', {
  autoConnect: false // We will connect manually upon login or loading leaderboard
});
