Quarto Pro Bot
===============

Open index.html in a browser.

What it supports:
- Clickable Quarto board and pieces
- Human-vs-bot play with Easy, Normal, Hard, and Expert difficulty
- Official piece set by default, with editable custom inventories
- Official Quarto win detection for rows, columns, and diagonals
- Move notation import/export
- Suggestions from tactical, Monte Carlo, minimax-lite, and hybrid engines
- Basic exact endgame search when few pieces remain
- Undo/redo, sample game, dark mode

Notation:
- First line: give TLRF
- Later lines: place B2 give SDRH

Piece code:
Position 1: T/S = Tall/Short
Position 2: L/D = Light/Dark
Position 3: R/Q = Round/Square
Position 4: F/H = Solid/Hole

Squares:
A1-D4

Recommended use:
1. Use 2 player next to you for board-only pass-and-play.
2. Switch to Play bot if you want the browser to control one player.
3. Choose which player the bot controls and pick a difficulty.
4. Start with a piece if you are Player 1, or let the bot choose if it is Player 1.
5. Place your piece, then choose the next piece for the other player.

Notes:
This is a strong browser prototype, not a formally proven perfect Quarto solver. The hybrid engine combines immediate tactics, heuristic scoring, Monte Carlo rollouts, minimax-lite, and endgame search.
