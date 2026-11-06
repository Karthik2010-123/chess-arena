'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const { chooseBotMove, getAnalysis } = require('./botEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3001;
const rooms = new Map();
const matchmakingQueue = [];

function makeRoom(roomId, white, black = 'Waiting for opponent') {
  const room = { id: roomId, game: new Chess(), players: { white, black }, bot: null };
  rooms.set(roomId, room);
  return room;
}

function roomState(room) {
  let status = 'Game in progress';
  if (room.game.isCheckmate()) status = `${room.game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate`;
  else if (room.game.isDraw()) status = 'Draw';
  else if (room.game.isCheck()) status = 'Check';
  return {
    id: room.id,
    fen: room.game.fen(),
    players: room.players,
    turn: room.game.turn(),
    history: room.game.history({ verbose: true }),
    status,
    winner: room.game.isCheckmate() ? (room.game.turn() === 'w' ? 'Black' : 'White') : null,
  };
}

function lobbyList() {
  return [...rooms.values()]
    .filter((room) => !room.bot && room.players.black === 'Waiting for opponent' && !room.game.isGameOver())
    .map((room) => ({ roomId: room.id, players: room.players }));
}

function sendLobbyList() {
  io.emit('lobby-list', lobbyList());
}

io.on('connection', (socket) => {
  socket.on('request-lobby-list', () => socket.emit('lobby-list', lobbyList()));

  socket.on('create-room', ({ roomId, playerName }) => {
    if (!roomId || !playerName) return socket.emit('status-message', 'Enter a player name and create a room.');
    const room = makeRoom(roomId, playerName);
    socket.join(roomId);
    socket.emit('joined-room', { roomId });
    io.to(roomId).emit('game-state', roomState(room));
    socket.emit('status-message', `Room ${roomId} created. Share the room code with a friend.`);
    sendLobbyList();
  });

  socket.on('join-room', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('status-message', 'Room does not exist. Refresh the lobby and try again.');
    if (room.bot || room.players.black !== 'Waiting for opponent') {
      return socket.emit('status-message', 'This room is full. Choose another room.');
    }
    room.players.black = playerName || 'Guest';
    socket.join(roomId);
    socket.emit('joined-room', { roomId });
    io.to(roomId).emit('game-state', roomState(room));
    io.to(roomId).emit('status-message', `${room.players.black} joined the game.`);
    sendLobbyList();
  });

  socket.on('quick-match', ({ playerName }) => {
    const waitingIndex = matchmakingQueue.findIndex((entry) => entry.socketId !== socket.id);
    if (waitingIndex === -1) {
      matchmakingQueue.push({ socketId: socket.id, playerName: playerName || 'Player' });
      socket.emit('status-message', 'Searching for an opponent. Keep this page open.');
      return;
    }

    const opponent = matchmakingQueue.splice(waitingIndex, 1)[0];
    const roomId = `match-${Math.random().toString(36).slice(2, 8)}`;
    const room = makeRoom(roomId, opponent.playerName, playerName || 'Player');
    const opponentSocket = io.sockets.sockets.get(opponent.socketId);
    if (opponentSocket) {
      opponentSocket.join(roomId);
      opponentSocket.emit('joined-room', { roomId });
      opponentSocket.emit('game-state', roomState(room));
    }
    socket.join(roomId);
    socket.emit('joined-room', { roomId });
    io.to(roomId).emit('game-state', roomState(room));
    sendLobbyList();
  });

  socket.on('start-bot-match', ({ roomId, playerName, botName }) => {
    const room = makeRoom(roomId, playerName || 'Player', botName || 'Alexander');
    room.bot = { name: botName || 'Alexander', side: 'b' };
    socket.join(roomId);
    socket.emit('joined-room', { roomId });
    io.to(roomId).emit('game-state', roomState(room));
    socket.emit('status-message', `You are playing ${room.bot.name}. You move first as White.`);
  });

  socket.on('make-move', ({ roomId, move }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('status-message', 'Room not found.');
    if (room.game.isGameOver()) return socket.emit('status-message', 'This game has ended.');
    if (room.bot && room.game.turn() === room.bot.side) return socket.emit('status-message', 'The bot is thinking.');

    try {
      room.game.move({ from: move.from, to: move.to, promotion: 'q' });
    } catch (_error) {
      return socket.emit('status-message', 'Illegal move. Select a legal move.');
    }
    io.to(roomId).emit('game-state', roomState(room));

    if (room.bot && room.game.turn() === room.bot.side && !room.game.isGameOver()) {
      setTimeout(() => {
        const botMove = chooseBotMove(room.game, room.bot.name);
        if (!botMove || room.game.isGameOver()) return;
        room.game.move({ from: botMove.from, to: botMove.to, promotion: botMove.promotion || 'q' });
        io.to(roomId).emit('game-state', roomState(room));
        io.to(roomId).emit('status-message', `${room.bot.name} played ${botMove.san}.`);
      }, 350);
    }
  });

  socket.on('request-analysis', ({ roomId, botName }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('status-message', 'Room not found.');
    socket.emit('analysis-result', getAnalysis(room.game, botName || room.bot?.name || 'Alexander'));
  });

  socket.on('disconnect', () => {
    const index = matchmakingQueue.findIndex((entry) => entry.socketId === socket.id);
    if (index !== -1) matchmakingQueue.splice(index, 1);
  });
});

app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true, message: 'Chess Arena server is running.' }));
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

server.listen(PORT, () => console.log(`Chess Arena server running on http://localhost:${PORT}`));
