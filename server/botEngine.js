* {
  box-sizing: border-box;
}

:root {
  font-family: Inter, 'Segoe UI', sans-serif;
  color: #f3f5ff;
  background: #0d1321;
  line-height: 1.5;
  font-weight: 400;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(63, 121, 255, 0.2), transparent 35%),
    linear-gradient(135deg, #0d1321, #111827 40%, #0f172a);
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  width: min(1320px, 96vw);
  margin: 0 auto;
  padding: 32px 0 40px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0;
  font-size: 0.74rem;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

h1 {
  margin: 6px 0 0;
  font-size: clamp(2rem, 4vw, 3.5rem);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.top-actions input,
.top-actions button,
.panel button,
.panel select {
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.8);
  color: white;
}

.top-actions button,
.panel button,
.primary {
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  border: none;
  transition: transform 0.15s ease;
}

.top-actions button:hover,
.panel button:hover,
.primary:hover {
  transform: translateY(-1px);
}

.main-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.7fr);
  gap: 20px;
}

.board-panel,
.panel {
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
}

.board-panel {
  padding: 18px;
}

.board-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 8px 16px;
  color: #dbeafe;
}

.board-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  width: min(78vw, 760px);
  aspect-ratio: 1;
  border-radius: 16px;
  overflow: hidden;
  border: 10px solid rgba(30, 41, 59, 0.9);
  box-shadow: inset 0 0 0 2px rgba(148, 163, 184, 0.2);
}

.square {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  border: none;
  font-size: clamp(1.4rem, 2vw, 2.2rem);
  transition: filter 0.15s ease;
}

.square.light {
  background: #f0d9b5;
}

.square.dark {
  background: #b58863;
}

.square.selected {
  outline: 3px solid rgba(37, 99, 235, 0.9);
  outline-offset: -3px;
}

.square:hover {
  filter: brightness(1.05);
}

.piece {
  display: inline-block;
  transform: translateY(-2px);
}

.square-label {
  position: absolute;
  right: 6px;
  bottom: 4px;
  font-size: 0.58rem;
  opacity: 0.45;
  color: rgba(15, 23, 42, 0.7);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel {
  padding: 18px;
}

.panel h3 {
  margin-top: 0;
  margin-bottom: 12px;
}

.panel select {
  width: 100%;
  margin-bottom: 12px;
}

.panel button {
  width: 100%;
  margin-top: 8px;
}

.analysis-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
}

@media (max-width: 980px) {
  .main-layout {
    grid-template-columns: 1fr;
  }

  .board-grid {
    width: min(90vw, 640px);
  }
}
