// tetrisTemplate.js
// 靜態模板：包含結構、常數與基本函數定義（不包含邏輯與狀態）

export const ROWS = 20;
export const COLS = 10;
export const EMPTY = 0;

export const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [2, 2],
    [2, 2],
  ],
  T: [
    [0, 3, 0],
    [3, 3, 3],
  ],
  J: [
    [0, 0, 4],
    [4, 4, 4],
  ],
  L: [
    [5, 0, 0],
    [5, 5, 5],
  ],
  Z: [
    [6, 6, 0],
    [0, 6, 6],
  ],
  S: [
    [0, 7, 7],
    [7, 7, 0],
  ],
};

export const createEmptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

export const rotate = (matrix) => {
  return matrix[0].map((_, i) => matrix.map(row => row[i])).reverse();
};

export const rotateCounterClockwise = (shape) => rotate(rotate(rotate(shape)));

export const merge = (board, piece) => {
  const newBoard = board.map(row => [...row]);
  piece.shape.forEach((row, dy) => {
    row.forEach((val, dx) => {
      if (val) {
        newBoard[piece.y + dy][piece.x + dx] = val;
      }
    });
  });
  return newBoard;
};

export const isValidMove = (board, shape, x, y) =>
  shape.every((row, dy) =>
    row.every((val, dx) => {
      if (!val) return true;
      const newX = x + dx;
      const newY = y + dy;
      return (
        newX >= 0 && newX < COLS &&
        newY >= 0 && newY < ROWS &&
        board[newY][newX] === EMPTY
      );
    })
  );

export const getRandomShapeKey = (() => {
  const recentShapeKeys = [];
  return () => {
    const keys = Object.keys(SHAPES);
    const countMap = {};
    for (let key of recentShapeKeys) {
      countMap[key] = (countMap[key] || 0) + 1;
    }
    const filtered = keys.filter(k => (countMap[k] || 0) < 2);
    const pool = filtered.length > 0 ? filtered : keys;
    const chosenKey = pool[Math.floor(Math.random() * pool.length)];
    recentShapeKeys.push(chosenKey);
    if (recentShapeKeys.length > 9) recentShapeKeys.shift();
    return chosenKey;
  };
})();

export const getRandomShape = () => SHAPES[getRandomShapeKey()];
