const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const PLAYERS = {
  X: { name: "Damien", image: "boy_head.png", className: "x" },
  O: { name: "Anya", image: "girl_head.png", className: "o" },
};

const STORAGE_KEY = "ticTacToeScoresBoyGirlV1";
const SOUNDS = {
  win: new Audio("win.wav"),
  draw: new Audio("even.wav"),
};

const boardElement = document.querySelector("#board");
const cells = [...document.querySelectorAll(".cell")];
const statusElement = document.querySelector("#status");
const winnerBanner = document.querySelector("#winnerBanner");
const confettiElement = document.querySelector("#confetti");
const modeButtons = [...document.querySelectorAll(".mode-button")];
const scoreElements = {
  X: document.querySelector("#scoreX"),
  O: document.querySelector("#scoreO"),
  draw: document.querySelector("#scoreDraw"),
};

let board = Array(9).fill(null);
let currentPlayer = "X";
let mode = "ai";
let isGameOver = false;
let scores = loadScores();
let bannerTimer = null;

renderScores();
renderTurn();

boardElement.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell || isGameOver) return;

  const index = Number(cell.dataset.index);
  if (board[index]) return;
  if (mode === "ai" && currentPlayer === "O") return;

  playMove(index);
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    modeButtons.forEach((item) => item.classList.toggle("active", item === button));
    startNewRound();
  });
});

document.querySelector("#newRound").addEventListener("click", startNewRound);

document.querySelector("#resetScores").addEventListener("click", () => {
  scores = { X: 0, O: 0, draw: 0 };
  saveScores();
  renderScores();
  startNewRound();
});

function playMove(index) {
  board[index] = currentPlayer;
  renderCell(index, currentPlayer);

  const result = getResult(board);
  if (result) {
    finishRound(result);
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  renderTurn();

  if (mode === "ai" && currentPlayer === "O") {
    setTimeout(() => playMove(getBestMove()), 420);
  }
}

function finishRound(result) {
  isGameOver = true;
  cells.forEach((cell) => {
    cell.disabled = true;
  });

  if (result.winner) {
    scores[result.winner] += 1;
    result.line.forEach((index) => {
      cells[index].classList.add("win");
      cells[index].querySelector(".piece")?.classList.add("winner");
    });
    statusElement.textContent = `${PLAYERS[result.winner].name}勝出！`;
    showWinnerBanner(`${PLAYERS[result.winner].name} Winner!`);
    launchConfetti();
    playSound("win");
  } else {
    scores.draw += 1;
    statusElement.textContent = "平手！";
    showWinnerBanner("Draw Game!");
    playSound("draw");
  }

  saveScores();
  renderScores();
}

function startNewRound() {
  board = Array(9).fill(null);
  currentPlayer = "X";
  isGameOver = false;
  cells.forEach((cell) => {
    cell.textContent = "";
    cell.disabled = false;
    cell.classList.remove("win");
    cell.setAttribute("aria-label", `第 ${Number(cell.dataset.index) + 1} 格`);
  });
  hideWinnerBanner();
  clearConfetti();
  renderTurn();
}

function renderCell(index, player) {
  const img = document.createElement("img");
  img.className = `piece ${PLAYERS[player].className}`;
  img.src = PLAYERS[player].image;
  img.alt = `${PLAYERS[player].name} ${player}`;
  cells[index].append(img);
  cells[index].disabled = true;
  cells[index].setAttribute("aria-label", `第 ${index + 1} 格：${PLAYERS[player].name}`);
}

function renderTurn() {
  document.querySelectorAll(".player-score[data-player]").forEach((element) => {
    element.classList.toggle("active", element.dataset.player === currentPlayer);
  });

  if (mode === "ai" && currentPlayer === "O") {
    statusElement.textContent = "Anya思考中...";
    return;
  }

  statusElement.textContent = `${PLAYERS[currentPlayer].name}落子`;
}

function renderScores() {
  scoreElements.X.textContent = scores.X;
  scoreElements.O.textContent = scores.O;
  scoreElements.draw.textContent = scores.draw;
}

function getResult(state) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (state[a] && state[a] === state[b] && state[a] === state[c]) {
      return { winner: state[a], line };
    }
  }

  if (state.every(Boolean)) return { winner: null, line: [] };
  return null;
}

function getBestMove() {
  const available = board
    .map((value, index) => (value ? null : index))
    .filter((value) => value !== null);

  let bestScore = -Infinity;
  let bestMoves = [];

  for (const index of available) {
    board[index] = "O";
    const score = minimax(board, false);
    board[index] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [index];
    } else if (score === bestScore) {
      bestMoves.push(index);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function minimax(state, isMaximizing) {
  const result = getResult(state);
  if (result) {
    if (result.winner === "O") return 10;
    if (result.winner === "X") return -10;
    return 0;
  }

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (const index of emptyCells(state)) {
      state[index] = "O";
      bestScore = Math.max(bestScore, minimax(state, false));
      state[index] = null;
    }
    return bestScore;
  }

  let bestScore = Infinity;
  for (const index of emptyCells(state)) {
    state[index] = "X";
    bestScore = Math.min(bestScore, minimax(state, true));
    state[index] = null;
  }
  return bestScore;
}

function emptyCells(state) {
  return state
    .map((value, index) => (value ? null : index))
    .filter((value) => value !== null);
}

function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { X: 0, O: 0, draw: 0 };
  } catch {
    return { X: 0, O: 0, draw: 0 };
  }
}

function saveScores() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

function showWinnerBanner(message) {
  clearTimeout(bannerTimer);
  winnerBanner.textContent = message;
  winnerBanner.classList.remove("show");
  void winnerBanner.offsetWidth;
  winnerBanner.classList.add("show");
  bannerTimer = setTimeout(hideWinnerBanner, 5200);
}

function hideWinnerBanner() {
  clearTimeout(bannerTimer);
  winnerBanner.classList.remove("show");
  winnerBanner.textContent = "";
}

function launchConfetti() {
  clearConfetti();
  const colors = ["#f28aa4", "#738c54", "#eab44f", "#557da8", "#ffffff"];

  for (let i = 0; i < 52; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--left", `${Math.random() * 100}%`);
    piece.style.setProperty("--delay", `${Math.random() * 0.7}s`);
    piece.style.setProperty("--spin", `${Math.random() * 360}deg`);
    piece.style.setProperty("--color", colors[i % colors.length]);
    confettiElement.append(piece);
  }

  setTimeout(clearConfetti, 5500);
}

function clearConfetti() {
  confettiElement.textContent = "";
}

function playSound(soundName) {
  const sound = SOUNDS[soundName];
  if (!sound) return;

  sound.currentTime = 0;
  sound.play().catch(() => {});
}
