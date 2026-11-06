'use strict';

const { Chess } = require('chess.js');

const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const CENTER = new Set(['d4', 'e4', 'd5', 'e5', 'c4', 'f4', 'c3', 'f3', 'c6', 'f6', 'd3', 'e3', 'd6', 'e6']);

const botProfiles = {
  Alexander: { bias: 'aggressive', depth: 2, style: 'attacks the center and looks for forcing tactics.' },
  Cleopatra: { bias: 'positional', depth: 2, style: 'values central control, development, and king safety.' },
  'Sun Tzu': { bias: 'balanced', depth: 2, style: 'builds steady pressure and prefers flexible moves.' },
  Machiavelli: { bias: 'trap', depth: 2, style: 'looks for tactical tricks and punishes loose pieces.' },
  Nero: { bias: 'risky', depth: 2, style: 'seeks sharp attacks and initiative.' },
};

function evaluate(game, perspective, profile) {
  if (game.isCheckmate()) return game.turn() === perspective ? -100000 : 100000;
  if (game.isDraw()) return 0;

  const board = game.board();
  let score = 0;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece) continue;
      const square = `${String.fromCharCode(97 + col)}${8 - row}`;
      const sign = piece.color === perspective ? 1 : -1;
      score += sign * VALUES[piece.type];
      if (CENTER.has(square)) score += sign * (profile.bias === 'positional' ? 18 : 10);
      if (piece.type === 'p') {
        const advance = piece.color === 'w' ? 6 - row : row - 1;
        score += sign * advance * 4;
      }
    }
  }
  return score;
}

function search(game, depth, alpha, beta, perspective, profile) {
  if (depth <= 0 || game.isGameOver()) return evaluate(game, perspective, profile);
  const moves = game.moves({ verbose: true });
  const maximizing = game.turn() === perspective;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const next = new Chess(game.fen());
    next.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    let score = search(next, depth - 1, alpha, beta, perspective, profile);
    if (move.captured) score += (maximizing ? 1 : -1) * (VALUES[move.captured] || 0) * 0.1;
    if (move.san.includes('+')) score += maximizing ? 12 : -12;
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function chooseBotMove(game, botName = 'Alexander') {
  const profile = botProfiles[botName] || botProfiles.Alexander;
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  const perspective = game.turn();
  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const next = new Chess(game.fen());
    next.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    let score = search(next, profile.depth - 1, -Infinity, Infinity, perspective, profile);
    if (move.captured) score += (VALUES[move.captured] || 0) * 0.12;
    if (move.san.includes('+')) score += 15;
    if (CENTER.has(move.to)) score += profile.bias === 'positional' ? 14 : 8;
    if (profile.bias === 'aggressive' && move.to[1] > '4') score += 5;
    if (profile.bias === 'risky' && move.captured) score += 8;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

function getAnalysis(game, botName = 'Alexander') {
  const profile = botProfiles[botName] || botProfiles.Alexander;
  const perspective = game.turn();
  const ranked = game.moves({ verbose: true }).map((move) => {
    const next = new Chess(game.fen());
    next.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    const score = search(next, 1, -Infinity, Infinity, perspective, profile);
    return { move, score };
  }).sort((a, b) => b.score - a.score).slice(0, 3);

  return {
    summary: profile.style,
    moves: ranked.map(({ move, score }) => ({
      san: move.san,
      from: move.from,
      to: move.to,
      reason: score > 100 ? 'Wins material or creates a strong threat.' : 'A solid candidate based on the current position.',
    })),
  };
}

module.exports = { botProfiles, chooseBotMove, getAnalysis };
