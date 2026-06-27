(() => {
  const LINES = [
    [0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],
    [0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],
    [0,5,10,15],[3,6,9,12]
  ];
  const ATTR = ['height','color','shape','top'];
  const ATTR_NAMES = {height:['Short','Tall'], color:['Dark','Light'], shape:['Round','Square'], top:['Hollow','Filled']};
  const FILE = 'Quarto Customizable Bot';
  const OFFICIAL_CODES = ['SDRH','SDRF','SDQH','SDQF','SLRH','SLRF','SLQH','SLQF','TDRH','TDRF','TDQH','TDQF','TLRH','TLRF','TLQH','TLQF'];
  const YOUR_SET_CODES = ['SDRH','SDRF','SDQF','TDQH','SLRH','SLRF','SLQH','SLQF','TDRH','TDRF','TDQH','TDQF','TLRH','TLRF','TLQH','TLQF'];
  const loadInventory = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('quartoInventoryCodes') || 'null');
      if (Array.isArray(saved) && saved.length === 16) { const clean = saved.map(x => String(x).trim().toUpperCase()); if (clean.every(x => /^[TS][LD][QR][FH]$/.test(x))) return clean; }
    } catch(e) {}
    return OFFICIAL_CODES.slice();
  };
  let INVENTORY_CODES = loadInventory();
  const bitsFromCode = (s) => (s[0]==='T'?8:0) | (s[1]==='L'?4:0) | (s[2]==='Q'?2:0) | (s[3]==='F'?1:0);
  let ATTR_BITS = INVENTORY_CODES.map(bitsFromCode);
  const refreshAttrBits = () => { ATTR_BITS = INVENTORY_CODES.map(bitsFromCode); };
  const attrOf = (id) => ATTR_BITS[id];
  const codeOf = (id) => INVENTORY_CODES[id];
  const pieceKey = (id) => `${codeOf(id)}#${id}`;
  const parsePieceCode = (s) => {
    s = (s||'').trim().toUpperCase();
    if (!/^[TS][LD][QR][FH]$/.test(s)) throw new Error(`Bad piece code: ${s}`);
    return s;
  };
  const parsePieceAvailable = (s) => {
    const code = parsePieceCode(s);
    const matches = [...state.available].filter(id => codeOf(id) === code).sort((a,b)=>a-b);
    if (!matches.length) throw new Error(`Piece ${code} is not available in this custom set.`);
    return matches[0];
  };
  const squareToIndex = (sq) => {
    sq = (sq||'').trim().toUpperCase();
    if (!/^[A-D][1-4]$/.test(sq)) throw new Error(`Bad square: ${sq}`);
    const c = sq.charCodeAt(0) - 65;
    const r = Number(sq[1]) - 1;
    return r * 4 + c;
  };
  const indexToSquare = (i) => String.fromCharCode(65 + (i % 4)) + (Math.floor(i/4)+1);

  function newState() {
    return {
      board: Array(16).fill(null),
      available: new Set([...Array(INVENTORY_CODES.length).keys()]),
      currentPiece: null,
      chooser: 0,
      placer: 1,
      winner: null,
      winLine: null,
      history: [],
      redo: []
    };
  }
  let state = newState();
  let selectedSuggestion = null;

  const els = {
    board: document.getElementById('board'), pieces: document.getElementById('pieces'),
    phaseLabel: document.getElementById('phaseLabel'), statusText: document.getElementById('statusText'),
    turnBadge: document.getElementById('turnBadge'), currentPieceLabel: document.getElementById('currentPieceLabel'),
    currentPiecePreview: document.getElementById('currentPiecePreview'),
    suggestBtn: document.getElementById('suggestBtn'), applyBestBtn: document.getElementById('applyBestBtn'),
    undoBtn: document.getElementById('undoBtn'), redoBtn: document.getElementById('redoBtn'), resetBtn: document.getElementById('resetBtn'),
    engineSelect: document.getElementById('engineSelect'), simSelect: document.getElementById('simSelect'), depthSelect: document.getElementById('depthSelect'),
    analysisPanel: document.getElementById('analysisPanel'), analysisContent: document.getElementById('analysisContent'),
    botEnabled: document.getElementById('botEnabled'), botSide: document.getElementById('botSide'), botDifficulty: document.getElementById('botDifficulty'),
    diagonalBoard: document.getElementById('diagonalBoard'),
    evalFill: document.getElementById('evalFill'), evalText: document.getElementById('evalText'), recommendations: document.getElementById('recommendations'),
    threats: document.getElementById('threats'), notationBox: document.getElementById('notationBox'), loadNotationBtn: document.getElementById('loadNotationBtn'),
    exportBtn: document.getElementById('exportBtn'), copyBtn: document.getElementById('copyBtn'), sampleBtn: document.getElementById('sampleBtn'), history: document.getElementById('history'),
    themeBtn: document.getElementById('themeBtn'), inventoryBox: document.getElementById('inventoryBox'), inventoryStatus: document.getElementById('inventoryStatus'), officialPresetBtn: document.getElementById('officialPresetBtn'), defectivePresetBtn: document.getElementById('defectivePresetBtn'), saveSetBtn: document.getElementById('saveSetBtn')
  };

  function cloneCore(s) {
    return {
      board: s.board.slice(), available: new Set([...s.available]), currentPiece: s.currentPiece,
      chooser: s.chooser, placer: s.placer, winner: s.winner, winLine: s.winLine ? s.winLine.slice() : null
    };
  }
  function restoreCore(c) { Object.assign(state, c, {history: state.history, redo: state.redo}); }

  function pieceNode(p, mini=false) {
    const d = document.createElement('div');
    d.className = `piece ${mini?'piece-mini':''} ${attrOf(p)&4?'light-piece':'dark-piece'} ${attrOf(p)&8?'tall':'short'} ${attrOf(p)&2?'square':'round'} ${attrOf(p)&1?'filled':'hollow'}`;
    d.dataset.code = codeOf(p);
    d.title = describePiece(p);
    return d;
  }
  function describePiece(p) {
    return `${attrOf(p)&8?'Tall':'Short'} ${attrOf(p)&4?'Light':'Dark'} ${attrOf(p)&2?'Square':'Round'} ${attrOf(p)&1?'Filled':'Hollow'} (${codeOf(p)})`;
  }
  function checkWin(board) {
    for (const line of LINES) {
      const vals = line.map(i => board[i]);
      if (vals.some(v => v === null)) continue;
      for (let bit=0; bit<4; bit++) {
        const mask = 1 << bit;
        const all1 = vals.every(v => (attrOf(v) & mask) !== 0);
        const all0 = vals.every(v => (attrOf(v) & mask) === 0);
        if (all1 || all0) return {line, attr: ATTR[3-bit], value: all1 ? 1 : 0};
      }
    }
    return null;
  }
  function legalPlacements(s=state) { return s.board.map((v,i)=>v===null?i:null).filter(v=>v!==null); }
  function legalPieces(s=state) { return [...s.available]; }
  function afterPlaceAndGive(s, square, givePiece) {
    const n = {board:s.board.slice(), available:new Set([...s.available]), currentPiece:s.currentPiece, chooser:s.chooser, placer:s.placer, winner:s.winner, winLine:s.winLine};
    if (n.currentPiece === null) throw new Error('No current piece to place. Start with give XXXX.');
    if (n.board[square] !== null) throw new Error('Square is occupied.');
    n.board[square] = n.currentPiece;
    n.available.delete(n.currentPiece);
    const w = checkWin(n.board);
    if (w) { n.winner = s.placer; n.winLine = w.line; n.currentPiece = null; return n; }
    if (n.available.size === 0) { n.winner = 'draw'; n.currentPiece = null; return n; }
    if (givePiece === null || givePiece === undefined) throw new Error('You must give a next piece.');
    if (!n.available.has(givePiece)) throw new Error(`Piece ${codeOf(givePiece)} is not available.`);
    n.currentPiece = givePiece;
    n.available.delete(givePiece);
    n.chooser = s.placer;
    n.placer = s.chooser;
    return n;
  }
  function startGive(piece, record=true) {
    if (state.currentPiece !== null || state.history.length) throw new Error('Game already started. Reset or load notation from scratch.');
    if (!state.available.has(piece)) throw new Error('Piece unavailable.');
    pushUndo(record, `give ${codeOf(piece)}`);
    state.currentPiece = piece; state.available.delete(piece); state.chooser = 0; state.placer = 1; hideAnalysis(); render();
  }
  function applyMove(square, givePiece, label=null, record=true) {
    pushUndo(record, label || `place ${indexToSquare(square)} give ${codeOf(givePiece)}`);
    const next = afterPlaceAndGive(state, square, givePiece);
    Object.assign(state, next);
    pendingSquare = null;
    hideAnalysis();
    render();
  }
  function pushUndo(record, notation) {
    if (!record) return;
    state.history.push({before: cloneCore(state), notation});
    state.redo = [];
  }
  function undo() {
    const item = state.history.pop(); if (!item) return;
    state.redo.push({before: cloneCore(state), notation:item.notation}); restoreCore(item.before); render();
  }
  function redo() {
    const item = state.redo.pop(); if (!item) return;
    const notation = item.notation;
    parseLine(notation, true, false);
    state.history.push(item);
    render();
  }

  function render() {
    syncInventoryBox();
    selectedSuggestion = null; els.applyBestBtn.disabled = true;
    els.suggestBtn.disabled = false;
    els.suggestBtn.title = '';
    els.board.innerHTML = '';
    for (let i=0;i<16;i++) {
      const c = document.createElement('button'); c.className = 'cell'; c.dataset.square = indexToSquare(i);
      if (state.winLine && state.winLine.includes(i)) c.classList.add('win');
      if (pendingSquare === i) c.classList.add('pending');
      if (state.board[i] !== null) c.appendChild(pieceNode(state.board[i]));
      c.onclick = () => onCell(i); els.board.appendChild(c);
    }
    els.pieces.innerHTML = '';
    for (const p of legalPieces().sort((a,b)=>a-b)) {
      const chip = document.createElement('div'); chip.className = 'piece-chip';
      chip.dataset.piece = String(p);
      chip.appendChild(pieceNode(p, true));
      const span = document.createElement('span'); span.className = 'piece-ref'; span.textContent = `${codeOf(p)} #${p+1}`; chip.appendChild(span);
      chip.onclick = () => onPiece(p); els.pieces.appendChild(chip);
    }
    els.currentPieceLabel.textContent = state.currentPiece===null ? 'None' : describePiece(state.currentPiece);
    els.currentPiecePreview.innerHTML = '';
    if (state.currentPiece !== null) els.currentPiecePreview.appendChild(pieceNode(state.currentPiece));
    if (state.winner === 'draw') { els.phaseLabel.textContent = 'Draw'; els.statusText.textContent = 'Board filled with no Quarto.'; els.turnBadge.textContent = 'Game over'; }
    else if (state.winner !== null) { els.phaseLabel.textContent = `Player ${state.winner} wins`; els.statusText.textContent = 'A shared attribute line was completed.'; els.turnBadge.textContent = 'Game over'; }
    else if (state.currentPiece === null) { els.phaseLabel.textContent = 'Choose first piece'; els.statusText.textContent = 'Click a remaining piece or type give XXXX.'; els.turnBadge.textContent = 'P0 chooses'; }
    else { els.phaseLabel.textContent = `Player ${state.placer} places`; els.statusText.textContent = `Place ${codeOf(state.currentPiece)}, then choose a piece for Player ${state.chooser}.`; els.turnBadge.textContent = `P${state.placer} to place`; }
    if (isBotTurn() && !botThinking) {
      els.statusText.textContent = state.currentPiece === null ? 'Bot will choose the first piece.' : 'Bot will place this piece and choose one for you.';
      els.turnBadge.textContent += ' (bot)';
    }
    els.history.innerHTML = '';
    state.history.forEach((h, idx) => { const li = document.createElement('li'); li.textContent = h.notation; els.history.appendChild(li); });
    updateThreats();
    scheduleBotMove();
  }
  let pendingSquare = null;
  let botThinking = false;
  let botTimer = null;
  function botPlayer() { return Number(els.botSide.value); }
  function botEnabled() { return !!els.botEnabled.checked; }
  function activeActor(s=state) { return s.currentPiece === null ? s.chooser : s.placer; }
  function isBotTurn(s=state) {
    return botEnabled() && s.winner === null && activeActor(s) === botPlayer();
  }
  function humanTurnBlocked() { return botThinking || isBotTurn(); }
  function setAnalysisOpen(open) {
    els.analysisPanel.hidden = false;
  }
  function clearSuggestionHighlights() {
    els.board.querySelectorAll('.suggested').forEach(el => el.classList.remove('suggested'));
    els.pieces.querySelectorAll('.suggested').forEach(el => el.classList.remove('suggested'));
    els.recommendations.querySelectorAll('.top').forEach(el => el.classList.remove('top'));
  }
  function hideAnalysis() {
    selectedSuggestion = null;
    els.applyBestBtn.disabled = true;
    clearSuggestionHighlights();
  }
  function highlightSuggestion({square=null, piece=null}={}) {
    clearSuggestionHighlights();
    if (square !== null) {
      const cell = els.board.querySelector(`[data-square="${indexToSquare(square)}"]`);
      if (cell) cell.classList.add('suggested');
    }
    if (piece !== null) {
      const chip = els.pieces.querySelector(`[data-piece="${piece}"]`);
      if (chip) chip.classList.add('suggested');
    }
  }
  function onCell(i) {
    if (humanTurnBlocked()) return;
    if (state.winner !== null || state.currentPiece === null || state.board[i] !== null) return;
    pendingSquare = i;
    hideAnalysis();
    render();
    els.statusText.textContent = `Selected ${indexToSquare(i)}. Now click a piece to give next.`;
  }
  function onPiece(p) {
    try {
      if (humanTurnBlocked()) return;
      if (state.currentPiece === null && state.history.length === 0) startGive(p);
      else if (pendingSquare !== null) { applyMove(pendingSquare, p); pendingSquare = null; }
    } catch (e) { alert(e.message); }
  }

  function immediateWinningSquares(s, piece) {
    return legalPlacements(s).filter(pos => {
      const b = s.board.slice(); b[pos] = piece; return !!checkWin(b);
    });
  }
  function unsafeGivePieces(sAfterPlacement) {
    const bad = [];
    for (const p of sAfterPlacement.available) if (immediateWinningSquares(sAfterPlacement, p).length) bad.push(p);
    return bad;
  }
  function evaluateBoard(s, perspective) {
    if (s.winner === perspective) return 1e6;
    if (s.winner === 'draw') return 0;
    if (s.winner !== null) return -1e6;
    let score = 0;
    for (const line of LINES) {
      const vals = line.map(i => s.board[i]);
      const filled = vals.filter(v => v !== null);
      const empty = 4 - filled.length;
      if (filled.length === 0) continue;
      for (let bit=0; bit<4; bit++) {
        const mask = 1 << bit;
        const ones = filled.filter(v => attrOf(v) & mask).length;
        const zeros = filled.length - ones;
        if (ones === filled.length || zeros === filled.length) {
          const add = [0, 1, 10, 70, 10000][filled.length] - empty;
          score += add;
        }
      }
    }
    // Prefer central squares slightly.
    [5,6,9,10].forEach(i => { if (s.board[i] !== null) score += 2; });
    return score;
  }
  function randomChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
  function randomPlayout(s, perspective) {
    let n = {board:s.board.slice(), available:new Set([...s.available]), currentPiece:s.currentPiece, chooser:s.chooser, placer:s.placer, winner:s.winner, winLine:null};
    let guard = 0;
    while (n.winner === null && guard++ < 40) {
      const wins = immediateWinningSquares(n, n.currentPiece);
      const sq = wins.length ? wins[0] : randomChoice(legalPlacements(n));
      const after = {board:n.board.slice(), available:new Set([...n.available]), currentPiece:n.currentPiece, chooser:n.chooser, placer:n.placer, winner:n.winner, winLine:null};
      after.board[sq] = after.currentPiece; after.available.delete(after.currentPiece);
      const w = checkWin(after.board);
      if (w) { after.winner = n.placer; n = after; break; }
      if (after.available.size === 0) { after.winner = 'draw'; n = after; break; }
      const safe = [...after.available].filter(p => immediateWinningSquares(after, p).length === 0);
      const gp = safe.length ? randomChoice(safe) : randomChoice([...after.available]);
      after.currentPiece = gp; after.available.delete(gp); after.chooser = n.placer; after.placer = n.chooser;
      n = after;
    }
    return n.winner === perspective ? 1 : n.winner === 'draw' ? 0.5 : 0;
  }
  function candidateMoves(s=state) {
    if (s.currentPiece === null || s.winner !== null) return [];
    const moves = [];
    for (const sq of legalPlacements(s)) {
      const placed = {board:s.board.slice(), available:new Set([...s.available]), currentPiece:s.currentPiece, chooser:s.chooser, placer:s.placer, winner:null, winLine:null};
      placed.board[sq] = placed.currentPiece; placed.available.delete(placed.currentPiece);
      const w = checkWin(placed.board);
      if (w || placed.available.size === 0) { moves.push({square:sq, give:null, terminal:true}); continue; }
      for (const gp of placed.available) moves.push({square:sq, give:gp, terminal:false});
    }
    return moves;
  }
  function applyCandidate(s, m) {
    if (m.terminal) {
      const n = {board:s.board.slice(), available:new Set([...s.available]), currentPiece:s.currentPiece, chooser:s.chooser, placer:s.placer, winner:null, winLine:null};
      n.board[m.square] = n.currentPiece; n.available.delete(n.currentPiece);
      const w = checkWin(n.board); n.winner = w ? s.placer : (n.available.size===0?'draw':null); n.currentPiece = null; return n;
    }
    return afterPlaceAndGive(s, m.square, m.give);
  }
  function tacticalScore(s, m, perspective) {
    const n = applyCandidate(s, m);
    if (n.winner === perspective) return 1e7;
    if (n.winner !== null && n.winner !== 'draw') return -1e7;
    let score = evaluateBoard(n, perspective);
    const bad = unsafeGivePieces(n).length;
    if (!m.terminal && immediateWinningSquares(n, m.give).length) score -= 100000;
    score -= bad * 120;
    // reward giving opponent fewer safe options
    const safeCount = [...n.available].filter(p => immediateWinningSquares(n, p).length === 0).length;
    score += (16 - safeCount) * 3;
    return score;
  }
  function minimax(s, depth, alpha, beta, perspective) {
    if (depth === 0 || s.winner !== null || s.currentPiece === null) return evaluateBoard(s, perspective);
    const maximizing = s.placer === perspective;
    let best = maximizing ? -Infinity : Infinity;
    const moves = candidateMoves(s).sort((a,b)=>tacticalScore(s,b,perspective)-tacticalScore(s,a,perspective)).slice(0, 80);
    for (const m of moves) {
      const val = minimax(applyCandidate(s,m), depth-1, alpha, beta, perspective);
      if (maximizing) { best = Math.max(best, val); alpha = Math.max(alpha, val); }
      else { best = Math.min(best, val); beta = Math.min(beta, val); }
      if (beta <= alpha) break;
    }
    return best;
  }
  function exactEndgame(s, perspective, memo=new Map()) {
    const key = s.board.map(v=>v===null?'.':v.toString(16)).join('')+'|'+[...s.available].sort((a,b)=>a-b).join(',')+'|'+s.currentPiece+'|'+s.placer;
    if (memo.has(key)) return memo.get(key);
    if (s.winner === perspective) return 1;
    if (s.winner === 'draw') return 0;
    if (s.winner !== null) return -1;
    if (s.currentPiece === null) return 0;
    const maximizing = s.placer === perspective;
    let best = maximizing ? -2 : 2;
    for (const m of candidateMoves(s)) {
      const val = exactEndgame(applyCandidate(s,m), perspective, memo);
      best = maximizing ? Math.max(best, val) : Math.min(best, val);
      if ((maximizing && best === 1) || (!maximizing && best === -1)) break;
    }
    memo.set(key, best); return best;
  }
  function analyze(options={}) {
    const s = options.state || state;
    if (s.currentPiece === null || s.winner !== null) return [];
    const engine = options.engine || els.engineSelect.value;
    // Hard safety caps: browsers are delicate little flowers when handed a full game tree.
    const requestedSims = Number(options.sims || els.simSelect.value);
    const requestedDepth = Number(options.depth || els.depthSelect.value);
    const sims = Math.min(requestedSims, engine === 'mcts' ? 2000 : 800);
    const depth = Math.min(requestedDepth, engine === 'minimax' ? 4 : 3);
    const deadline = performance.now() + (options.deadlineMs || 1200);
    const perspective = options.perspective ?? s.placer;
    let moves = candidateMoves(s);
    if (engine === 'random') moves = [randomChoice(moves)];
    // Pre-order and limit heavy search. Full branching can be silly, and silliness has CPU costs.
    moves = moves.sort((a,b)=>tacticalScore(s,b,perspective)-tacticalScore(s,a,perspective)).slice(0, engine==='mcts'?40:55);
    const recs = moves.map(m => {
      const n = applyCandidate(s,m);
      let wins=0, draws=0, losses=0, score=tacticalScore(s,m,perspective), exact=null;
      if (performance.now() > deadline) return {move:m, score, wins, draws, losses, exact, timedOut:true};
      if (n.available.size <= 4 && (engine==='hybrid' || engine==='minimax')) {
        exact = exactEndgame(n, perspective);
        score += exact * 900000;
      }
      if (engine === 'minimax' || engine === 'hybrid') score += minimax(n, Math.max(1, depth-1), -Infinity, Infinity, perspective) * 0.20;
      if (engine === 'mcts' || engine === 'hybrid') {
        const localSims = Math.max(8, Math.floor(sims / Math.min(moves.length, 40)));
        for (let i=0;i<localSims && performance.now() < deadline;i++) {
          const r = randomPlayout(n, perspective);
          if (r === 1) wins++; else if (r === 0.5) draws++; else losses++;
        }
        const done = Math.max(1, wins + draws + losses);
        score += ((wins + 0.5*draws) / done) * 10000;
      }
      return {move:m, score, wins, draws, losses, exact};
    }).sort((a,b)=>b.score-a.score).slice(0,5);
    return recs;
  }
  function analyzeGivePieces(square) {
    if (state.currentPiece === null || state.winner !== null) return [];
    const perspective = state.placer;
    return candidateMoves(state)
      .filter(m => m.square === square)
      .map(move => ({move, score: tacticalScore(state, move, perspective)}))
      .sort((a,b) => b.score - a.score)
      .slice(0,5);
  }
  function analyzeStartPieces() {
    return legalPieces(state)
      .map(piece => {
        const draft = {
          board: state.board.slice(),
          available: new Set([...state.available]),
          currentPiece: piece,
          chooser: 0,
          placer: 1,
          winner: null,
          winLine: null
        };
        draft.available.delete(piece);
        const badSquares = immediateWinningSquares(draft, piece).length;
        const safeReplies = [...draft.available].filter(p => immediateWinningSquares(draft, p).length === 0).length;
        return {piece, score: safeReplies * 4 - badSquares * 100};
      })
      .sort((a,b) => b.score - a.score)
      .slice(0,5);
  }
  function botStartPiece() {
    const pieces = legalPieces();
    if (els.botDifficulty.value === 'easy') return randomChoice(pieces);
    const safePieces = pieces.filter(p => !immediateWinningSquares(state, p).length);
    return randomChoice(safePieces.length ? safePieces : pieces);
  }
  function botCandidate() {
    const moves = candidateMoves();
    if (!moves.length) return null;
    const difficulty = els.botDifficulty.value;
    if (difficulty === 'easy') return randomChoice(moves);
    const perspective = state.placer;
    const tactical = moves
      .map(move => ({move, score: tacticalScore(state, move, perspective)}))
      .sort((a,b) => b.score - a.score);
    if (difficulty === 'normal') return randomChoice(tactical.slice(0, Math.min(3, tactical.length))).move;
    const search = analyze({
      engine: difficulty === 'expert' ? 'hybrid' : 'minimax',
      sims: difficulty === 'expert' ? 1200 : 300,
      depth: difficulty === 'expert' ? 4 : 3,
      deadlineMs: difficulty === 'expert' ? 1400 : 700,
      perspective
    });
    return (search[0] && search[0].move) || tactical[0].move;
  }
  function scheduleBotMove() {
    clearTimeout(botTimer);
    if (!isBotTurn() || botThinking) return;
    botTimer = setTimeout(runBotMove, 350);
  }
  function runBotMove() {
    if (!isBotTurn() || botThinking) return;
    botThinking = true;
    els.statusText.textContent = state.currentPiece === null ? 'Bot is choosing the first piece.' : 'Bot is thinking.';
    setTimeout(() => {
      try {
        if (state.currentPiece === null) {
          const p = botStartPiece();
          startGive(p, true);
        } else {
          const m = botCandidate();
          if (!m) return;
          pendingSquare = null;
          if (m.give === null) applyMove(m.square, null, `bot place ${indexToSquare(m.square)}`);
          else applyMove(m.square, m.give, `bot place ${indexToSquare(m.square)} give ${codeOf(m.give)}`);
        }
      } catch(e) {
        alert('Bot move failed: ' + e.message);
      } finally {
        botThinking = false;
        render();
      }
    }, 30);
  }
  function showAnalysis() {
    setAnalysisOpen(true);
    els.suggestBtn.disabled = true;
    els.suggestBtn.textContent = 'Analyzing...';
    els.recommendations.textContent = 'Analyzing without melting the browser...';
    setTimeout(() => {
    try {
    if (state.currentPiece === null) {
      const recs = analyzeStartPieces();
      if (!recs.length) { els.recommendations.textContent = 'No piece recommendation available.'; return; }
      const best = recs[0];
      selectedSuggestion = {type:'start', piece:best.piece};
      els.applyBestBtn.disabled = false;
      els.evalFill.style.width = '55%';
      els.evalText.textContent = `Best first piece: give ${codeOf(best.piece)} | eval ${Math.round(best.score)}`;
      els.recommendations.innerHTML = '';
      recs.forEach((r, idx) => {
        const div = document.createElement('div'); div.className = `recommendation ${idx===0?'top':''}`;
        div.innerHTML = `<strong>#${idx+1}</strong> Give <strong>${codeOf(r.piece)}</strong><br><span class="muted">first piece | score ${Math.round(r.score)}</span>`;
        els.recommendations.appendChild(div);
      });
      highlightSuggestion({piece:best.piece});
      return;
    }
    if (pendingSquare !== null) {
      const recs = analyzeGivePieces(pendingSquare);
      if (!recs.length) { els.recommendations.textContent = 'No piece recommendation available.'; return; }
      const best = recs[0];
      selectedSuggestion = {type:'give', piece:best.move.give, square:pendingSquare};
      els.applyBestBtn.disabled = best.move.give === null;
      els.evalFill.style.width = '65%';
      els.evalText.textContent = best.move.give === null ? `Best: ${indexToSquare(pendingSquare)} ends the game.` : `Best: give ${codeOf(best.move.give)} after ${indexToSquare(pendingSquare)} | eval ${Math.round(best.score)}`;
      els.recommendations.innerHTML = '';
      recs.forEach((r, idx) => {
        const div = document.createElement('div'); div.className = `recommendation ${idx===0?'top':''}`;
        div.innerHTML = `<strong>#${idx+1}</strong> Give <strong>${r.move.give===null?'none':codeOf(r.move.give)}</strong><br><span class="muted">after placing at ${indexToSquare(pendingSquare)} | score ${Math.round(r.score)}</span>`;
        els.recommendations.appendChild(div);
      });
      highlightSuggestion({piece:best.move.give});
      return;
    }
    const recs = analyze();
    if (!recs.length) { els.recommendations.textContent = 'No legal analysis.'; return; }
    selectedSuggestion = {type:'move', move:recs[0].move}; els.applyBestBtn.disabled = false;
    const best = recs[0];
    const total = best.wins + best.draws + best.losses;
    const pct = total ? Math.round(((best.wins + 0.5*best.draws)/total)*100) : Math.max(0, Math.min(100, Math.round(50 + best.score/40000)));
    els.evalFill.style.width = `${pct}%`;
    els.evalText.textContent = `Best: place ${indexToSquare(best.move.square)}${best.move.give===null?' and win/end game':`, give ${codeOf(best.move.give)}`} | eval ${Math.round(best.score)} | confidence ${pct}%`;
    els.recommendations.innerHTML = '';
    recs.forEach((r, idx) => {
      const total = r.wins+r.draws+r.losses;
      const est = total ? ` W/D/L ${Math.round(r.wins/total*100)}%/${Math.round(r.draws/total*100)}%/${Math.round(r.losses/total*100)}%` : '';
      const ex = r.exact === 1 ? ' forced win' : r.exact === -1 ? ' forced loss' : r.exact === 0 ? ' forced draw' : '';
      const div = document.createElement('div'); div.className = `recommendation ${idx===0?'top':''}`;
      div.innerHTML = `<strong>#${idx+1}</strong> Place <strong>${indexToSquare(r.move.square)}</strong>${r.move.give===null?'':` then give <strong>${codeOf(r.move.give)}</strong>`}<br><span class="muted">score ${Math.round(r.score)}${est}${ex}</span>`;
      els.recommendations.appendChild(div);
    });
    highlightSuggestion({square:best.move.square});
    } catch (e) {
      els.recommendations.textContent = 'Analysis failed: ' + e.message;
    } finally {
      els.suggestBtn.disabled = false;
      els.suggestBtn.textContent = 'Suggest move';
    }
    }, 20);
  }
  function updateThreats() {
    if (state.currentPiece === null || state.winner !== null) { els.threats.textContent = 'No active placement.'; return; }
    const wins = immediateWinningSquares(state, state.currentPiece);
    const bad = unsafeGivePieces(state);
    let html = '';
    if (wins.length) html += `<span class="threat-pill">Winning square(s): ${wins.map(indexToSquare).join(', ')}</span>`;
    if (bad.length) html += `<span class="threat-pill">Dangerous pieces to give: ${bad.map(codeOf).join(', ')}</span>`;
    els.threats.innerHTML = html || '<span class="muted">No immediate win or instant-give danger detected.</span>';
  }
  function parseLine(line, allowRedo=false, record=true) {
    line = line.trim(); if (!line || line.startsWith('#')) return;
    const g = /^give\s+([TS][LD][QR][FH])$/i.exec(line);
    const pg = /^place\s+([A-D][1-4])(?:\s+give\s+([TS][LD][QR][FH]))?$/i.exec(line);
    if (g) return startGive(parsePieceAvailable(g[1]), record);
    if (pg) return applyMove(squareToIndex(pg[1]), pg[2]?parsePieceAvailable(pg[2]):null, line, record);
    throw new Error(`Cannot parse: ${line}`);
  }
  function loadNotation() {
    const lines = els.notationBox.value.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    state = newState(); pendingSquare = null;
    try { for (const line of lines) parseLine(line, false, true); render(); }
    catch(e) { alert(e.message); render(); }
  }
  function exportNotation() { els.notationBox.value = state.history.map(h=>h.notation).join('\n'); }
  function sample() {
    els.notationBox.value = `give TLRF\nplace B2 give SDRH\nplace C3 give TLQH\nplace A4 give TDQH\nplace D1 give TDRF`;
  }

  function inventoryText(codes=INVENTORY_CODES) {
    return codes.map((c,i)=>`${String(i+1).padStart(2,'0')}: ${c}`).join('\n');
  }
  function parseInventoryText(text) {
    const codes = text.split(/\n+/).map(line => line.replace(/^\s*\d+\s*[:.)-]?\s*/, '').trim().toUpperCase()).filter(Boolean);
    if (codes.length !== 16) throw new Error(`Inventory must contain exactly 16 piece codes. Found ${codes.length}.`);
    for (const c of codes) parsePieceCode(c);
    return codes;
  }
  function inventorySummary(codes=INVENTORY_CODES) {
    const counts = new Map();
    OFFICIAL_CODES.forEach(c => counts.set(c, 0));
    codes.forEach(c => counts.set(c, (counts.get(c)||0)+1));
    const duplicates = [...counts].filter(([_,n])=>n>1).map(([c,n])=>`${c}×${n}`);
    const missing = OFFICIAL_CODES.filter(c => !counts.get(c));
    let msg = `Loaded ${codes.length} pieces.`;
    if (duplicates.length) msg += ` Duplicates: ${duplicates.join(', ')}.`;
    if (missing.length) msg += ` Missing official: ${missing.join(', ')}.`;
    return msg;
  }
  let inventoryBoxDirty = false;
  function syncInventoryBox() {
    if (!els.inventoryBox) return;
    if (document.activeElement !== els.inventoryBox && !inventoryBoxDirty) els.inventoryBox.value = inventoryText();
    els.inventoryStatus.textContent = inventorySummary();
  }
  function applyInventory(codes, save=false) {
    INVENTORY_CODES = codes.slice();
    refreshAttrBits();
    if (save) localStorage.setItem('quartoInventoryCodes', JSON.stringify(INVENTORY_CODES));
    state = newState();
    pendingSquare = null;
    selectedSuggestion = null;
    hideAnalysis();
    inventoryBoxDirty = false;
    render();
  }


  els.suggestBtn.onclick = showAnalysis;
  els.applyBestBtn.onclick = () => {
    if (!selectedSuggestion) return;
    if (selectedSuggestion.type === 'start') {
      startGive(selectedSuggestion.piece);
      return;
    }
    if (selectedSuggestion.type === 'give') {
      applyMove(selectedSuggestion.square, selectedSuggestion.piece, `place ${indexToSquare(selectedSuggestion.square)} give ${codeOf(selectedSuggestion.piece)}`);
      return;
    }
    const m = selectedSuggestion.move;
    if (m.give === null) applyMove(m.square, null, `place ${indexToSquare(m.square)}`);
    else applyMove(m.square, m.give, `place ${indexToSquare(m.square)} give ${codeOf(m.give)}`);
  };
  els.undoBtn.onclick = undo; els.redoBtn.onclick = redo;
  els.resetBtn.onclick = () => { state = newState(); pendingSquare = null; els.notationBox.value=''; els.recommendations.textContent='Click Suggest move.'; els.evalText.textContent='No analysis yet.'; els.evalFill.style.width='50%'; hideAnalysis(); render(); };
  els.loadNotationBtn.onclick = loadNotation; els.exportBtn.onclick = exportNotation; els.sampleBtn.onclick = sample;
  els.copyBtn.onclick = async () => { exportNotation(); try { await navigator.clipboard.writeText(els.notationBox.value); } catch(e) {} };
  els.themeBtn.onclick = () => { document.body.classList.toggle('dark'); els.themeBtn.textContent = document.body.classList.contains('dark') ? 'Light mode' : 'Dark mode'; };
  els.inventoryBox.oninput = () => {
    inventoryBoxDirty = true;
    try {
      const codes = parseInventoryText(els.inventoryBox.value);
      applyInventory(codes, false);
      els.inventoryStatus.textContent = inventorySummary() + ' Applied to the board.';
    } catch(e) {
      els.inventoryStatus.textContent = e.message;
    }
  };
  els.officialPresetBtn.onclick = () => {
    els.inventoryBox.value = inventoryText(OFFICIAL_CODES);
    applyInventory(OFFICIAL_CODES, false);
    els.inventoryStatus.textContent = inventorySummary() + ' Applied to the board.';
  };
  els.defectivePresetBtn.onclick = () => {
    els.inventoryBox.value = inventoryText(YOUR_SET_CODES);
    applyInventory(YOUR_SET_CODES, false);
    els.inventoryStatus.textContent = inventorySummary() + ' Applied to the board.';
  };
  els.saveSetBtn.onclick = () => { try { applyInventory(parseInventoryText(els.inventoryBox.value), true); els.inventoryStatus.textContent = inventorySummary() + ' Saved in this browser.'; } catch(e) { alert(e.message); } };
  els.botEnabled.onchange = () => { hideAnalysis(); pendingSquare = null; render(); };
  els.botSide.onchange = () => { hideAnalysis(); pendingSquare = null; render(); };
  els.botDifficulty.onchange = () => { hideAnalysis(); if (isBotTurn()) scheduleBotMove(); };
  els.diagonalBoard.onchange = () => { els.board.classList.toggle('diagonal', els.diagonalBoard.checked); };
  render();
})();
