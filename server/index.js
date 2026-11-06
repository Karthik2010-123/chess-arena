const pieceValues = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const botProfiles = {
  Alexander: {
    bias: 'aggressive',
    style: 'attacks the center, develops knights and queen quickly, and likes tactical shots.',
  },
  Cleopatra: {
    bias: 'positional',
    style: 'controls the center, improves the king safely, and values long-term space advantage.',
  },
  'Sun Tzu': {
    bias: 'balanced',
    style: 'uses tempo, mobility, and calm pressure to gain small but durable advantages.',
  },
  Machiavelli: {
    bias: 'trap',
    style: 'creates traps, forces errors, and punishes careless king movement.',
  },
  Nero: {
    bias: 'risky',
    style: 'plays bold, attacking moves and takes chances with sharp initiative.',
  },
};

function centerControlScore(move) {
  const centerSquares = ['d4', 'e4', 'd5', 'e5', 'c3', 'f3', 'c6', 'f6'];
  return centerSquares.includes(move.to) ? 18 : 0;
}

function getMoveHeuristic(move, chess, profile) {
  let score = 0;

  if (move.captured) {
    score += pieceValues[move.captured] * 1.5;
  }

  score += centerControlScore(move);

  const pieceValue = pieceValues[move.piece];
  score += pieceValue * 0.08;

  if (move.san.includes('+') || move.san.includes('#')) {
    score += 60;
  }

  if (profile.bias === 'aggressive') {
    score += move.to[1] > '4' ? 15 : 5;
  }

  if (profile.bias === 'positional') {
    score += ['c', 'd', 'e', 'f'].includes(move.to[0]) ? 12 : 4;
  }

  if (profile.bias === 'trap') {
    score += move.to[1] === '4' ? 12 : 0;
  }

  if (profile.bias === 'risky') {
    score += Math.random() * 25;
  }

  return score;
}

function chooseBotMove(game, botName = 'Alexander') {
  const profile = botProfiles[botName] || botProfiles.Alexander;
  const legalMoves = game.moves({ verbose: true });

  if (!legalMoves.length) return null;

  const scoredMoves = legalMoves.map((move) => {
    const nextTurn = new (require('chess.js').Chess)(game.fen());
    nextTurn.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });

    const material = nextTurn.board().flat().reduce((total, piece) => {
      if (!piece) return total;
      const value = pieceValues[piece.type] || 0;
      return total + (piece.color === 'w' ? value : -value);
    }, 0);

    return {
      move,
      score: getMoveHeuristic(move, game, profile) + material * 0.05,
    };
  });

  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves[0].move;
}

function getAnalysis(game, botName = 'Alexander') {
  const profile = botProfiles[botName] || botProfiles.Alexander;
  const moves = game.moves({ verbose: true });

  if (!moves.length) {
    return { summary: 'No legal moves left in the current position.', moves: [] };
  }

  const ranked = moves
    .map((move) => ({
      ...move,
      score: getMoveHeuristic(move, game, profile),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return {
    summary: `${profile.style}`,
    moves: ranked.map((move) => ({
      san: move.san,
      from: move.from,
      to: move.to,
      reason: `${profile.bias} plan: ${profile.style}`,
    })),
  };
}

module.exports = {
  chooseBotMove,
  getAnalysis,
  botProfiles,
};
