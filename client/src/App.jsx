import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';

const PIECE_MAP = {
  w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
  b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' },
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function App() {
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState('Player 1');
  const [roomId, setRoomId] = useState('');
  const [botName, setBotName] = useState('Alexander');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [gameState, setGameState] = useState({
    fen: new Chess().fen(),
    players: { white: 'White', black: 'Black' },
    turn: 'w',
    status: 'Choose a room or start a bot match.',
    history: [],
  });
  const [analysis, setAnalysis] = useState([]);
  const [message, setMessage] = useState('Welcome to Chess Arena.');

  useEffect(() => {
    const s = io({ autoConnect: true });

    s.on('connect', () => {
      setMessage('Connected to Chess Arena server.');
    });

    s.on('game-state', (payload) => {
      setGameState(payload);
      setMessage(payload.status || 'Game updated.');
    });

    s.on('analysis-result', (payload) => {
      setAnalysis(payload.moves || []);
      setMessage(payload.summary || 'Analysis ready.');
    });

    s.on('status-message', (text) => setMessage(text));

    setSocket(s);

    return () => s.disconnect();
  }, []);

  const board = useMemo(() => {
    const chess = new Chess(gameState.fen);
    const rows = chess.board();
    return rows.map((row, rowIndex) =>
      row.map((piece, colIndex) => {
        if (!piece) {
          return null;
        }

        const square = `${FILES[colIndex]}${8 - rowIndex}`;
        return { piece, square };
      })
    );
  }, [gameState.fen]);

  const createRoom = () => {
    if (!socket) return;
    const generatedRoom = `room-${Math.random().toString(36).slice(2, 6)}`;
    setRoomId(generatedRoom);
    socket.emit('create-room', { roomId: generatedRoom, playerName });
  };

  const joinRoom = () => {
    if (!socket || !roomId) return;
    socket.emit('join-room', { roomId, playerName });
  };

  const startBotMatch = () => {
    if (!socket) return;
    const generatedRoom = `bot-${Math.random().toString(36).slice(2, 6)}`;
    setRoomId(generatedRoom);
    socket.emit('start-bot-match', {
      roomId: generatedRoom,
      playerName,
      botName,
    });
  };

  const handleSquareClick = (square) => {
    if (!socket || !roomId) return;

    const chess = new Chess(gameState.fen);
    const piece = chess.get(square);

    if (selectedSquare) {
      const legalMove = {
        from: selectedSquare,
        to: square,
      };

      socket.emit('make-move', {
        roomId,
        move: legalMove,
      });
      setSelectedSquare(null);
      return;
    }

    if (piece && piece.color === gameState.turn) {
      setSelectedSquare(square);
    }
  };

  const requestAnalysis = () => {
    if (!socket || !roomId) return;
    socket.emit('request-analysis', { roomId, botName });
  };

  const renderBoard = () => {
    const squares = [];

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const file = FILES[col];
        const rank = 8 - row;
        const square = `${file}${rank}`;
        const piece = new Chess(gameState.fen).get(square);

        const isLight = (row + col) % 2 === 0;
        const isSelected = selectedSquare === square;

        squares.push(
          <button
            type="button"
            key={square}
            className={`square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''}`}
            onClick={() => handleSquareClick(square)}
          >
            {piece ? (
              <span className={`piece ${piece.color}`}>
                {PIECE_MAP[piece.color][piece.type]}
              </span>
            ) : null}
            <span className="square-label">{square}</span>
          </button>
        );
      }
    }

    return squares;
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Strategy board</p>
          <h1>Chess Arena</h1>
        </div>
        <div className="top-actions">
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player name"
          />
          <button onClick={createRoom}>Create Room</button>
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </header>

      <main className="main-layout">
        <section className="board-panel">
          <div className="board-toolbar">
            <div>
              <span>Room:</span>
              <strong> {roomId || 'none'}</strong>
            </div>
            <div>
              <span>Turn:</span>
              <strong> {gameState.turn === 'w' ? 'White' : 'Black'}</strong>
            </div>
          </div>

          <div className="board-grid">{renderBoard()}</div>
        </section>

        <aside className="sidebar">
          <div className="panel">
            <h3>Bot match</h3>
            <select value={botName} onChange={(e) => setBotName(e.target.value)}>
              <option value="Alexander">Alexander</option>
              <option value="Cleopatra">Cleopatra</option>
              <option value="Sun Tzu">Sun Tzu</option>
              <option value="Machiavelli">Machiavelli</option>
              <option value="Nero">Nero</option>
            </select>
            <button className="primary" onClick={startBotMatch}>Start Bot Match</button>
            <button onClick={requestAnalysis}>Analyze Position</button>
          </div>

          <div className="panel">
            <h3>Game status</h3>
            <p>{message}</p>
            <small>
              White: {gameState.players?.white || 'White'}
              <br />
              Black: {gameState.players?.black || 'Black'}
            </small>
          </div>

          <div className="panel">
            <h3>Suggested next moves</h3>
            {analysis.length === 0 ? (
              <p>No analysis yet. Ask for a position review.</p>
            ) : (
              <ul className="analysis-list">
                {analysis.map((move, index) => (
                  <li key={`${move.from}-${move.to}-${index}`}>
                    <strong>{move.san}</strong> — {move.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
