Quarto Pro Bot
===============

Open index.html in a browser.

What it supports:
- Clickable Quarto board and pieces
- Human-vs-bot play with Easy, Normal, Hard, and Expert difficulty
- Private online rooms with Firebase Realtime Database
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
1. Use Local Two Player for board-only pass-and-play.
2. Switch to Play bot if you want the browser to control one player.
3. Choose which player the bot controls and pick a difficulty.
4. Start with a piece if you are Player 1, or let the bot choose if it is Player 1.
5. Place your piece, then choose the next piece for the other player.

Firebase multiplayer setup:
1. Create a Firebase project at https://console.firebase.google.com/.
2. In Authentication, enable Anonymous sign-in.
3. In Realtime Database, create a database and use this database URL:
   https://fourfoldarena-default-rtdb.firebaseio.com
4. In Project settings > General, add a Web app and copy its Firebase config.
5. Paste the config values into firebase.js. The databaseURL is already set.
6. Keep apiKey, authDomain, projectId, and appId as normal Firebase web config values. Do not put private service account keys in this app.

Running locally:
1. From this folder, run a static file server, for example:
   python -m http.server 8000
2. Open http://localhost:8000 in a browser.
3. For online play, switch Mode to Play online, create a room, and share the room code.

Deploying to Firebase Hosting:
1. Install the Firebase CLI if needed:
   npm install -g firebase-tools
2. Sign in:
   firebase login
3. Initialize hosting in this folder:
   firebase init hosting
4. Choose the Firebase project, use this folder as the public directory, and do not overwrite index.html.
5. Deploy:
   firebase deploy

Notes:
This is a strong browser prototype, not a formally proven perfect Quarto solver. The hybrid engine combines immediate tactics, heuristic scoring, Monte Carlo rollouts, minimax-lite, and endgame search.
