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
  const [profile, setProfile] = useState({
    title: 'Chess Analyst',
    rating: 1450,
    wins: 12,
    losses: 8,
    streak: 3,
  });
  const [roomId, setRoomId] = useState('');
  const [botName, setBotName] = useState('Alexander');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [selectedLobby, setSelectedLobby] = useState('');
  const [lobbies, setLobbies] = useState([]);
  const [gameState, setGameState] = useState({
    fen: new Chess().fen(),
    players: { white: 'White', black: 'Black' },
    turn: 'w',
    status: 'Select a bot and start a match.',
    history: [],
  });
  const [analysis, setAnalysis] = useState([]);
  const [message, setMessage] = useState('Connected to Chess Arena.');
  const [activeView, setActiveView] = useState('landing');

  useEffect(() => {
    const s = io({ autoConnect: true });

    s.on('connect', () => {
      setMessage('Connected to Chess Arena server.');
      s.emit('request-lobby-list');
    });

    s.on('lobby-list', (items) => setLobbies(items || []));

    s.on('game-state', (payload) => {
      setGameState(payload);
      setMessage(payload.status || 'Game updated.');
      setActiveView('play');
    });

    s.on('analysis-result', (payload) => {
      setAnalysis(payload.moves || []);
      setMessage(payload.summary || 'Analysis ready.');
    });

    s.on('status-message', (text) => setMessage(text));
    s.on('joined-room', ({ roomId: joinedRoom }) => {
      setRoomId(joinedRoom);
      setActiveView('play');
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  const boardMatrix = useMemo(() => {
    const chess = new Chess(gameState.fen);
    const rows = chess.board();

    return rows.map((row, rowIndex) =>
      row.map((piece, colIndex) => {
        if (!piece) return null;
        const square = `${FILES[colIndex]}${8 - rowIndex}`;
        return { piece, square };
      })
    );
  }, [gameState.fen]);

  const createRoom = () => {
    if (!socket) return;
    const generatedRoom = `room-${Math.random().toString(36).slice(2, 7)}`;
    setRoomId(generatedRoom);
    socket.emit('create-room', { roomId: generatedRoom, playerName });
    setActiveView('play');
  };

  const joinRoom = (selectedRoomId = roomId) => {
    if (!socket || !selectedRoomId) return;
    socket.emit('join-room', { roomId: selectedRoomId, playerName });
    setRoomId(selectedRoomId);
    setActiveView('play');
  };

  const quickMatch = () => {
    if (!socket) return;
    socket.emit('quick-match', { playerName });
  };

  const startBotMatch = () => {
    if (!socket) return;
    const generatedRoom = `bot-${Math.random().toString(36).slice(2, 7)}`;
    setRoomId(generatedRoom);
    socket.emit('start-bot-match', {
      roomId: generatedRoom,
      playerName,
      botName,
    });
    setActiveView('play');
  };

  const handleSquareClick = (square) => {
    if (!socket || !roomId) return;
    const chess = new Chess(gameState.fen);
    const piece = chess.get(square);

    if (selectedSquare) {
      socket.emit('make-move', {
        roomId,
        move: { from: selectedSquare, to: square },
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
            {piece ? <span className={`piece ${piece.color}`}>{PIECE_MAP[piece.color][piece.type]}</span> : null}
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
        <div className="brand-block">
          <div className="brand-mark">♟</div>
          <div>
            <p className="eyebrow">Strategy board</p>
            <h1>Chess Arena</h1>
          </div>
        </div>

        <nav className="nav-links">
          <span onClick={() => setActiveView('landing')}>Home</span>
          <span onClick={() => setActiveView('play')}>Play</span>
          <span onClick={() => setActiveView('analysis')}>Analysis</span>
          <span onClick={() => setActiveView('bot')}>Bot Arena</span>
        </nav>

        <div className="top-actions">
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player name"
          />
          <button onClick={createRoom}>Create Room</button>
          <button onClick={quickMatch}>Quick Match</button>
        </div>
      </header>

      {activeView === 'landing' && (
        <section className="landing-shell">
          <div className="hero-panel">
            <div>
              <p className="hero-tag">Live Bot Battle</p>
              <h2>Smarter AI opponents with distinct ancient-character-inspired styles</h2>
            </div>
            <div className="hero-metrics">
              <div>
                <strong>Bot IQ</strong>
                <span>Adaptive</span>
              </div>
              <div>
                <strong>Style</strong>
                <span>Dynamic</span>
              </div>
              <div>
                <strong>Analysis</strong>
                <span>Live</span>
              </div>
            </div>
          </div>

          <div className="landing-grid">
            <div className="landing-card profile-card">
              <div className="panel-header">
                <h3>Player Profile</h3>
                <span className="pill">{profile.title}</span>
              </div>
              <div className="profile-topline">
                <div className="avatar">{playerName.slice(0, 2).toUpperCase()}</div>
                <div>
                  <strong>{playerName}</strong>
                  <p>Rating: {profile.rating}</p>
                </div>
              </div>
              <div className="stat-grid">
                <div><span>Wins</span><strong>{profile.wins}</strong></div>
                <div><span>Losses</span><strong>{profile.losses}</strong></div>
                <div><span>Streak</span><strong>{profile.streak}</strong></div>
                <div><span>Rank</span><strong>GM</strong></div>
              </div>
            </div>

            <div className="landing-card">
              <div className="panel-header">
                <h3>Quick Start</h3>
                <span className="pill live">Ready</span>
              </div>
              <button className="primary" onClick={quickMatch}>Play Ranked Match</button>
              <button onClick={startBotMatch}>Play Against Bot</button>
              <button onClick={() => setActiveView('play')}>Open Board</button>
            </div>

            <div className="landing-card">
              <div className="panel-header">
                <h3>Lobby</h3>
                <span className="pill">{lobbies.length} rooms</span>
              </div>
              <div className="lobby-list">
                {lobbies.length === 0 ? (
                  <p>No active rooms yet.</p>
                ) : (
                  lobbies.map((lobby) => (
                    <button
                      key={lobby.roomId}
                      type="button"
                      className={`lobby-row ${selectedLobby === lobby.roomId ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedLobby(lobby.roomId);
                        joinRoom(lobby.roomId);
                      }}
                    >
                      <span>{lobby.roomId}</span>
                      <small>{lobby.players?.white || 'Waiting'} vs {lobby.players?.black || 'Guest'}</small>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {(activeView === 'play' || activeView === 'analysis' || activeView === 'bot') && (
        <main className="main-layout">
          <section className="board-panel">
            <div className="board-toolbar">
              <div>
                <span>Room</span>
                <strong>{roomId || 'none'}</strong>
              </div>
              <div>
                <span>Turn</span>
                <strong>{gameState.turn === 'w' ? 'White' : 'Black'}</strong>
              </div>
            </div>

            <div className="board-wrapper">
              <div className="board-grid">{renderBoard()}</div>
            </div>
          </section>

          <aside className="sidebar">
            <div className="panel bot-panel">
              <div className="panel-header">
                <h3>Bot Match</h3>
                <span className="pill">AI</span>
              </div>

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
              <div className="panel-header">
                <h3>Game Status</h3>
                <span className="pill live">Live</span>
              </div>
              <p>{message}</p>
              <small>
                White: {gameState.players?.white || 'White'}
                <br />
                Black: {gameState.players?.black || 'Black'}
              </small>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>Next Best Ideas</h3>
              </div>

              {analysis.length === 0 ? (
                <p>No analysis yet. Request a review.</p>
              ) : (
                <ul className="analysis-list">
                  {analysis.map((move, index) => (
                    <li key={`${move.from}-${move.to}-${index}`}>
                      <strong>{move.san}</strong>
                      <span>{move.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}

export default App;
