const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const { chooseBotMove, getAnalysis } = require('./botEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 3001;
const rooms = new Map();

function createRoom(roomId, whitePlayerName, blackPlayerName = 'Guest') {
  const room = {
    id: roomId,
    game: new Chess(),
    players: {
      white: whitePlayerName,
      black: blackPlayerName,
    },
    bot: null,
  };

  rooms.set(roomId, room);
  return room;
}

function formatRoomState(room) {
  const winner = (() => {
    if (room.game.isCheckmate()) {
      return room.game.turn() === 'w' ? 'Black wins' : 'White wins';
    }

    if (room.game.isDraw()) {
      return 'Draw';
    }

    return null;
  })();

  return {
    id: room.id,
    fen: room.game.fen(),
    players: room.players,
    turn: room.game.turn(),
    history: room.game.history({ verbose: true }),
    status: winner || (room.game.isCheck() ? 'Check!' : 'Game in progress'),
    winner,
  };
}

io.on('connection', (socket) => {
  socket.on('create-room', ({ roomId, playerName }) => {
    const room = createRoom(roomId, playerName);
    socket.join(roomId);
    io.to(roomId).emit('game-state', formatRoomState(room));
    io.to(roomId).emit('status-message', `${playerName} created room ${roomId}.`);
  });

  socket.on('join-room', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('status-message', 'Room does not exist.');
      return;
    }

    room.players.black = playerName;
    socket.join(roomId);
    io.to(roomId).emit('game-state', formatRoomState(room));
    io.to(roomId).emit('status-message', `${playerName} joined ${roomId}.`);
  });

  socket.on('start-bot-match', ({ roomId, playerName, botName }) => {
    const room = createRoom(roomId, playerName, botName);
    room.bot = { name: botName, side: 'b' };
    socket.join(roomId);
    io.to(roomId).emit('game-state', formatRoomState(room));
    io.to(roomId).emit('status-message', `${playerName} started a match against ${botName}.`);
  });

  socket.on('make-move', ({ roomId, move }) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('status-message', 'Room not found.');
      return;
    }

    const isBotTurn = room.bot && room.game.turn() === room.bot.side;
    if (isBotTurn) {
      socket.emit('status-message', 'The bot is thinking. Please wait.');
      return;
    }

    try {
      const madeMove = room.game.move({
        from: move.from,
        to: move.to,
        promotion: 'q',
      });

      if (!madeMove) {
        socket.emit('status-message', 'Illegal move. Try another square.');
        return;
      }

      io.to(roomId).emit('game-state', formatRoomState(room));

      if (room.bot && room.game.turn() === room.bot.side) {
        setTimeout(() => {
          const botMove = chooseBotMove(room.game, room.bot.name);

          if (!botMove) {
            return;
          }

          room.game.move({
            from: botMove.from,
            to: botMove.to,
            promotion: 'q',
          });

          io.to(roomId).emit('game-state', formatRoomState(room));
          io.to(roomId).emit('status-message', `${room.bot.name} played ${botMove.from} to ${botMove.to}.`);
        }, 700);
      }
    } catch (error) {
      socket.emit('status-message', 'Illegal move. Try another square.');
    }
  });

  socket.on('request-analysis', ({ roomId, botName }) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('status-message', 'Room not found.');
      return;
    }

    const analysis = getAnalysis(room.game, botName || 'Alexander');
    socket.emit('analysis-result', analysis);
  });
});

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Chess Arena server is running.' });
});

const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath);
});

server.listen(PORT, () => {
  console.log(`Chess Arena server running on http://localhost:${PORT}`);
});
