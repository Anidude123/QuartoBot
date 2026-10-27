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

Deploying to GitHub Pages:
This app is a static site. GitHub Pages serves index.html, styles.css,
app.js, and firebase.js directly; no Python server, Streamlit, npm install,
or build step is needed. Asset paths are relative, so both a root site and
a project site (under /QuartoBot/) work.

To use exactly https://quartobot.github.io/:
1. You must own a GitHub user or organization account named quartobot.
   GitHub assigns github.io subdomains by account name, not the app name.
   Renaming Anidude123/QuartoBot alone cannot claim that address.
2. Under that account, create a public repository named quartobot.github.io
   and copy this project, including .github/workflows/pages.yml and
   .nojekyll, into its main branch. Alternatively, transfer and rename the
   existing repository if you want to move its history and issues too.
3. In the destination repository, open Settings > Pages and set
   Build and deployment > Source to GitHub Actions.
4. Push the files to main. The Deploy to GitHub Pages workflow publishes
   the site. For an existing push, open Actions > Deploy to GitHub Pages >
   Run workflow and select main.
5. Once the workflow succeeds, open https://quartobot.github.io/.

To keep the current Anidude123/QuartoBot repository:
Follow steps 3 and 4 there. Its normal Pages address is
https://anidude123.github.io/QuartoBot/.

The workflow deploys only the five static site files listed in its
Prepare static site step. If you add images or other local assets later,
include them in that step. If your deployment branch is not main, update
the workflow's push.branches setting accordingly. Do not add a CNAME
file for a github.io address; CNAME is for a custom domain you own.

Online multiplayer on GitHub Pages:
- Local and bot games work without Firebase configuration.
- Online rooms still require the Firebase setup described above. Pages
  hosts the frontend; Firebase continues to provide authentication and
  the Realtime Database.
- In Firebase Authentication > Settings > Authorized domains, add your
  deployed hostname (quartobot.github.io or anidude123.github.io), without
  https:// or a path.
- Configure your Firebase Realtime Database security rules for your app;
  publishing the frontend does not configure database access.

Deploying to Firebase Hosting (alternative):
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
