import React, { useState, useEffect, useRef } from 'react';
import './tetris.css';

const ROWS = 20;
const COLS = 10;
const EMPTY = 0;

// 定義方塊形狀
const SHAPES = {
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

const rotate = (matrix) => {
  return matrix[0].map((_, i) => matrix.map(row => row[i])).reverse();
};

const getRandomShape = () => {
  const keys = Object.keys(SHAPES);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return SHAPES[randomKey];
};

const createEmptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

const Tetris = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState({
    shape: getRandomShape(),
    x: 3,
    y: 0,
  });

  const gameInterval = useRef(null);

  const merge = (board, piece) => {
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

  const isValidMove = (shape, x, y) => {
    return shape.every((row, dy) =>
      row.every((val, dx) => {
        if (!val) return true;
        const newX = x + dx;
        const newY = y + dy;
        return (
          newX >= 0 &&
          newX < COLS &&
          newY >= 0 &&
          newY < ROWS &&
          board[newY][newX] === EMPTY
        );
      })
    );
  };

  const drop = () => {
    const { shape, x, y } = currentPiece;
    const newY = y + 1;

    if (isValidMove(shape, x, newY)) {
      setCurrentPiece({ shape, x, y: newY });
    } else {
      const newBoard = merge(board, currentPiece);
      clearLines(newBoard);
      setCurrentPiece({
        shape: getRandomShape(),
        x: 3,
        y: 0,
      });
    }
  };

  const clearLines = (newBoard) => {
    const updatedBoard = newBoard.filter(row => row.some(cell => cell === EMPTY));
    const linesCleared = ROWS - updatedBoard.length;
    while (updatedBoard.length < ROWS) {
      updatedBoard.unshift(Array(COLS).fill(EMPTY));
    }
    setBoard(updatedBoard);
  };

  const move = dir => {
    const { shape, x, y } = currentPiece;
    const newX = x + dir;
    if (isValidMove(shape, newX, y)) {
      setCurrentPiece({ shape, x: newX, y });
    }
  };

  const hardDrop = () => {
    let { shape, x, y } = currentPiece;
    while (isValidMove(shape, x, y + 1)) {
        y += 1;
    }
    const droppedPiece = { shape, x, y };
    const newBoard = merge(board, droppedPiece);
    clearLines(newBoard);
    setCurrentPiece({
        shape: getRandomShape(),
        x: 3,
        y: 0,
    });
  };

  const rotatePiece = () => {
    const { shape, x, y } = currentPiece;
    const rotatedShape = rotate(shape);
    if (isValidMove(rotatedShape, x, y)) {
      setCurrentPiece({ shape: rotatedShape, x, y });
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
    if (e.key === 'ArrowDown') drop();
    if (e.key === 'ArrowUp' || e.key === 'w') rotatePiece();
    if (e.code === 'Space') {
      e.preventDefault();
      hardDrop();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    gameInterval.current = setInterval(drop, 500);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(gameInterval.current);
    };
  });

  const renderCell = (val, i) => (
    <div key={i} className={`cell type-${val}`} />
  );

  const renderBoard = () => {
    const displayBoard = merge(board, currentPiece);
    return displayBoard.map((row, i) => (
      <div key={i} className="row">
        {row.map(renderCell)}
      </div>
    ));
  };

  return (
    <div className="tetris-board">
      {renderBoard()}
    </div>
  );
};

export default Tetris;
