// AILogic.js

export function getBestMove(board, current, next, hold, shapeMap, canHold) {
  const currentShapes = shapeMap[current.type];
  const currentResult = evaluateOption(board, current, next, currentShapes, shapeMap);

  let bestMove = { ...currentResult, hold: false };

  if (canHold) {
    const holdPiece = hold ? hold : next;
    const holdShapes = shapeMap[holdPiece.type];
    const holdResult = evaluateOption(board, holdPiece, next, holdShapes, shapeMap);
    if (holdResult.score > bestMove.score) {
      bestMove = { ...holdResult, hold: true };
    }
  }

  return bestMove;
}

function evaluateOption(board, tetromino, next, rotations, shapeMap) {
  const cols = board[0].length;
  let bestScore = -Infinity;
  let bestX = 0;
  let bestRotation = 0;

  for (let r = 0; r < rotations.length; r++) {
    const shape = getSafeShape(rotations, r);
    if (!shape || !shape[0]) continue;

    const width = shape[0].length;

    for (let x = -2; x < cols - width + 2; x++) {
      let y = 0;
      while (!checkCollision(board, shape, x, y)) y++;
      y--;

      if (y < 0) continue;

      const newBoard = merge(board, shape, x, y, getTetrominoId(tetromino.type));
      const score = evaluateBoard(newBoard);

      const leadsToDeadEnd = next && !hasValidMove(newBoard, next, shapeMap);
      const adjustedScore = leadsToDeadEnd ? score - 10000 : score;

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestX = x;
        bestRotation = r;
      }
    }
  }

  return { x: bestX, rotation: bestRotation, score: bestScore };
}

function hasValidMove(board, tetromino, shapeMap) {
  const shapes = shapeMap[tetromino.type];
  const cols = board[0].length;
  for (const shape of shapes) {
    if (!shape || !shape[0]) continue;
    const width = shape[0].length;
    for (let x = -2; x < cols - width + 2; x++) {
      let y = 0;
      while (!checkCollision(board, shape, x, y)) y++;
      if (y - 1 >= 0) return true;
    }
  }
  return false;
}

function merge(board, shape, x, y, id) {
  const newBoard = board.map(row => [...row]);
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[0].length; col++) {
      if (shape[row][col]) {
        const newX = x + col;
        const newY = y + row;
        if (newY >= 0 && newY < newBoard.length && newX >= 0 && newX < newBoard[0].length) {
          newBoard[newY][newX] = id;
        }
      }
    }
  }
  return newBoard;
}

function checkCollision(board, shape, x, y) {
  if (!shape || !shape[0]) return true;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[0].length; col++) {
      if (shape[row][col]) {
        const newX = x + col;
        const newY = y + row;
        if (
          newX < 0 || newX >= board[0].length ||
          newY >= board.length ||
          (newY >= 0 && board[newY][newX] !== 0)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function evaluateBoard(board) {
  let linesCleared = 0;
  let holes = 0;
  let heights = Array(board[0].length).fill(0);
  let bumpiness = 0;
  let totalHeight = 0;

  for (let row = 0; row < board.length; row++) {
    if (board[row].every(cell => cell !== 0)) linesCleared++;
  }

  for (let col = 0; col < board[0].length; col++) {
    let blockFound = false;
    for (let row = 0; row < board.length; row++) {
      if (board[row][col] !== 0) {
        if (!blockFound) {
          heights[col] = board.length - row;
          blockFound = true;
        }
      } else if (blockFound) {
        holes++;
      }
    }
  }

  for (let i = 0; i < heights.length - 1; i++) {
    bumpiness += Math.abs(heights[i] - heights[i + 1]);
  }

  totalHeight = heights.reduce((a, b) => a + b, 0);

  return linesCleared * 100 - holes * 30 - totalHeight * 1.5 - bumpiness * 1;
}

function getTetrominoId(type) {
  return { I: 1, O: 2, T: 3, J: 4, L: 5, Z: 6, S: 7 }[type];
}

function getSafeShape(rotations, rotationIndex) {
  if (!Array.isArray(rotations) || rotations.length === 0) return null;
  const safeIndex = typeof rotationIndex === 'number' ? rotationIndex % rotations.length : 0;
  return rotations[safeIndex];
}
