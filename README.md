# Chess Arena

A small Chess Arena prototype with a React/Vite board, a Socket.IO game server, a simple search-based bot, and a lobby/matchmaking interface.

## Run locally

1. Install Node.js 18 or newer.
2. Clone or open this repository in GitHub Codespaces.
3. In the terminal, run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the Vite port `5173` in the Ports tab (Codespaces may show a pop-up to open it).
5. Choose **Play Against Bot** (or select a bot in the board view and press **Start Bot Match**). Click one of your white pieces, then its destination square to move. The bot responds as Black.

The development server starts the Vite client on port 5173 and the Socket.IO server on port 3001. Multiplayer is a prototype: the server keeps games in memory, so rooms reset when it restarts. Quick Match only pairs players connected to the same running server instance. The rating/profile values shown in the UI are demo data, not persisted ratings.

## Build

```bash
npm run build
```
