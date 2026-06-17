// 테트리스 보드 크기 (가로 10칸, 세로 20칸)
const COLS = 10;
const ROWS = 20;
const DROP_INTERVAL_MS = 800;

// 한 번에 삭제한 줄 수별 점수
const LINE_SCORES = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

const PIECE_TYPES = ["I", "O", "T", "S", "Z", "J", "L"];

// 블록 모양 (4x4 격자, 1 = 채워진 칸)
const PIECES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "piece-i",
  },
  O: {
    shape: [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "piece-o",
  },
  T: {
    shape: [
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "piece-t",
  },
  S: {
    shape: [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "piece-s",
  },
  Z: {
    shape: [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "piece-z",
  },
  J: {
    shape: [
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "piece-j",
  },
  L: {
    shape: [
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "piece-l",
  },
};

const boardElement = document.getElementById("game-board");
const scoreElement = document.getElementById("score");
const gameOverElement = document.getElementById("game-over");
const startButton = document.getElementById("start-btn");
const restartButton = document.getElementById("restart-btn");

// 빈 보드 데이터 (0 = 빈 칸)
let board = createEmptyBoard();
let currentPiece = null;
let cellElements = [];
let dropTimer = null;
let isPlaying = false;
let isGameOver = false;
let score = 0;
let keyboardBound = false;

function createEmptyBoard() {
  const emptyBoard = [];
  for (let row = 0; row < ROWS; row++) {
    emptyBoard.push(new Array(COLS).fill(0));
  }
  return emptyBoard;
}

function getSpawnCol(shape) {
  let minCol = shape[0].length;
  let maxCol = 0;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
      }
    }
  }

  const width = maxCol - minCol + 1;
  return Math.floor((COLS - width) / 2) - minCol;
}

function createPiece(type) {
  const pieceData = PIECES[type];

  return {
    type: type,
    shape: pieceData.shape.map(function (row) {
      return row.slice();
    }),
    color: pieceData.color,
    row: 0,
    col: getSpawnCol(pieceData.shape),
  };
}

function createRandomPiece() {
  const randomIndex = Math.floor(Math.random() * PIECE_TYPES.length);
  return createPiece(PIECE_TYPES[randomIndex]);
}

function drawPiece(piece) {
  const cells = [];

  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (piece.shape[row][col]) {
        cells.push({
          row: piece.row + row,
          col: piece.col + col,
          color: piece.color,
        });
      }
    }
  }

  return cells;
}

function canMove(piece, dx, dy, matrix) {
  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (!piece.shape[row][col]) {
        continue;
      }

      const newRow = piece.row + row + dy;
      const newCol = piece.col + col + dx;

      if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) {
        return false;
      }

      if (matrix[newRow][newCol]) {
        return false;
      }
    }
  }

  return true;
}

function lockPiece(piece) {
  const cells = drawPiece(piece);

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    board[cell.row][cell.col] = cell.color;
  }
}

function isRowFull(row) {
  for (let col = 0; col < COLS; col++) {
    if (!board[row][col]) {
      return false;
    }
  }
  return true;
}

function clearLines() {
  let linesCleared = 0;

  for (let row = ROWS - 1; row >= 0; row--) {
    if (!isRowFull(row)) {
      continue;
    }

    board.splice(row, 1);
    board.unshift(new Array(COLS).fill(0));
    linesCleared += 1;
    row += 1;
  }

  return linesCleared;
}

function addScore(linesCleared) {
  if (linesCleared <= 0) {
    return;
  }

  const points = LINE_SCORES[linesCleared] || linesCleared * 100;
  score += points;
  scoreElement.textContent = String(score);
}

function showGameOver() {
  gameOverElement.classList.remove("hidden");
}

function hideGameOver() {
  gameOverElement.classList.add("hidden");
}

function setGameOver() {
  isGameOver = true;
  currentPiece = null;
  stopDrop();
  showGameOver();
  renderBoard();
}

function lockPieceAndContinue() {
  lockPiece(currentPiece);
  const linesCleared = clearLines();
  addScore(linesCleared);

  currentPiece = createRandomPiece();

  if (!canMove(currentPiece, 0, 0, board)) {
    setGameOver();
    return;
  }
}

function rotateShape(shape) {
  const size = shape.length;
  const rotated = [];

  for (let col = 0; col < size; col++) {
    const newRow = [];
    for (let row = size - 1; row >= 0; row--) {
      newRow.push(shape[row][col]);
    }
    rotated.push(newRow);
  }

  return rotated;
}

function rotatePiece(piece) {
  const previousShape = piece.shape;
  piece.shape = rotateShape(piece.shape);

  if (!canMove(piece, 0, 0, board)) {
    piece.shape = previousShape;
    return false;
  }

  return true;
}

function tryMovePiece(dx, dy) {
  if (!currentPiece || !isPlaying || isGameOver) {
    return false;
  }

  if (!canMove(currentPiece, dx, dy, board)) {
    return false;
  }

  currentPiece.col += dx;
  currentPiece.row += dy;
  return true;
}

function softDrop() {
  if (!currentPiece || !isPlaying || isGameOver) {
    return;
  }

  if (canMove(currentPiece, 0, 1, board)) {
    currentPiece.row += 1;
  } else {
    lockPieceAndContinue();
  }

  renderBoard();
}

function hardDrop() {
  if (!currentPiece || !isPlaying || isGameOver) {
    return;
  }

  while (canMove(currentPiece, 0, 1, board)) {
    currentPiece.row += 1;
  }

  lockPieceAndContinue();
  renderBoard();
}

function handleKeyDown(event) {
  if (!isPlaying || !currentPiece || isGameOver) {
    return;
  }

  let moved = false;

  switch (event.code) {
    case "ArrowLeft":
      event.preventDefault();
      moved = tryMovePiece(-1, 0);
      break;
    case "ArrowRight":
      event.preventDefault();
      moved = tryMovePiece(1, 0);
      break;
    case "ArrowDown":
      event.preventDefault();
      softDrop();
      return;
    case "ArrowUp":
      event.preventDefault();
      moved = rotatePiece(currentPiece);
      break;
    case "Space":
      event.preventDefault();
      hardDrop();
      return;
    default:
      return;
  }

  if (moved) {
    renderBoard();
  }
}

function bindKeyboardControls() {
  if (keyboardBound) {
    return;
  }

  document.addEventListener("keydown", handleKeyDown);
  keyboardBound = true;
}

function tick() {
  if (!currentPiece || !isPlaying || isGameOver) {
    return;
  }

  if (canMove(currentPiece, 0, 1, board)) {
    currentPiece.row += 1;
  } else {
    lockPieceAndContinue();
  }

  renderBoard();
}

function startDrop() {
  stopDrop();
  isPlaying = true;
  dropTimer = setInterval(tick, DROP_INTERVAL_MS);
}

function stopDrop() {
  if (dropTimer !== null) {
    clearInterval(dropTimer);
    dropTimer = null;
  }
  isPlaying = false;
}

function initBoardCells() {
  boardElement.innerHTML = "";
  cellElements = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      boardElement.appendChild(cell);
      cellElements.push(cell);
    }
  }
}

function renderBoard() {
  for (let i = 0; i < cellElements.length; i++) {
    cellElements[i].className = "cell";
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col]) {
        const index = row * COLS + col;
        cellElements[index].classList.add(board[row][col]);
      }
    }
  }

  if (currentPiece) {
    const pieceCells = drawPiece(currentPiece);

    for (let i = 0; i < pieceCells.length; i++) {
      const cell = pieceCells[i];
      const index = cell.row * COLS + cell.col;

      if (index >= 0 && index < cellElements.length) {
        cellElements[index].className = "cell " + cell.color;
      }
    }
  }
}

function resetGame() {
  stopDrop();
  board = createEmptyBoard();
  score = 0;
  isGameOver = false;
  currentPiece = createRandomPiece();
  scoreElement.textContent = "0";
  hideGameOver();
  renderBoard();
  startDrop();
}

startButton.addEventListener("click", function () {
  resetGame();
});

restartButton.addEventListener("click", function () {
  resetGame();
});

initBoardCells();
bindKeyboardControls();
currentPiece = createRandomPiece();
renderBoard();
