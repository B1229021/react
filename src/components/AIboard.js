import React, { useEffect, useState } from 'react';
import { getBestMove } from './AILogic';
import './AIboard.css';

const ROWS = 20;
const COLS = 10;

const SHAPES = {
  I: [[[1, 1, 1, 1]], [[1], [1], [1], [1]]],
  O: [[[2, 2], [2, 2]]],
  T: [[[0, 3, 0], [3, 3, 3]], [[3, 0], [3, 3], [3, 0]], [[3, 3, 3], [0, 3, 0]], [[0, 3], [3, 3], [0, 3]]],
  J: [[[0, 0, 4], [4, 4, 4]], [[4, 4], [0, 4], [0, 4]], [[4, 4, 4], [4, 0, 0]], [[4, 0], [4, 0], [4, 4]]],
  L: [[[5, 0, 0], [5, 5, 5]], [[0, 5], [0, 5], [5, 5]], [[5, 5, 5], [0, 0, 5]], [[5, 5], [5, 0], [5, 0]]],
  Z: [[[6, 6, 0], [0, 6, 6]], [[0, 6], [6, 6], [6, 0]]],
  S: [[[0, 7, 7], [7, 7, 0]], [[7, 0], [7, 7], [0, 7]]]
};

const TYPES = Object.keys(SHAPES);

function getTetrominoId(type) {
  return { I: 1, O: 2, T: 3, J: 4, L: 5, Z: 6, S: 7 }[type];
}

function randomTetromino() {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  return { type };
}



export default function AIBoard() {
  const [board, setBoard] = useState(() => Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
  const [current, setCurrent] = useState(randomTetromino());
  const [next, setNext] = useState(randomTetromino());
  const [hold, setHold] = useState(null);
  const [canHold, setCanHold] = useState(true);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [clearingRows, setClearingRows] = useState([]);
  const [isClearing, setIsClearing] = useState(false);
  const [aiX, setAiX] = useState(0);
  const [aiY, setAiY] = useState(0);
  const [aiRotation, setAiRotation] = useState(0);
  const [aiTarget, setAiTarget] = useState(null); // 存目標動作（AI的Move結果）
  const [aiPhase, setAiPhase] = useState('waiting'); // 'waiting' | 'dropping' | 'settling'


  function checkCollision(board, shape, x, y) {
      if (!shape || !Array.isArray(shape)) return true; // 如果 shape 無效，視為碰撞
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c]) {
          const newX = x + c;
          const newY = y + r;
          if (
            newX < 0 ||
            newX >= COLS ||
            newY >= ROWS ||
            (newY >= 0 && board[newY][newX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function merge(board, shape, x, y, id) {
    const newBoard = board.map((row) => [...row]);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c]) {
          const newX = x + c;
          const newY = y + r;
          if (newY >= 0 && newY < ROWS && newX >= 0 && newX < COLS) {
            newBoard[newY][newX] = id;
          }
        }
      }
    }
    return newBoard;
  }

  function getFullRows(board) {
    return board.reduce((acc, row, idx) => {
        if (row.every(cell => cell !== 0)) acc.push(idx);
        return acc;
    }, []);
  }


const displayBoard = board.map(row => [...row]);

if (aiTarget) { 
  const shape = SHAPES[aiTarget.type][aiTarget.rotation]; // ✅ 正確
  shape.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val) {
        const x = aiTarget.x + c;
        const y = aiTarget.y + r;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
          displayBoard[y][x] = getTetrominoId(aiTarget.type);
        }
      }
    });
  });
}



function getShape(tetromino) {
  if (!tetromino) return [];
  return SHAPES[tetromino.type][0];
}


useEffect(() => {
  if (isClearing || aiTarget) return;

  const move = getBestMove(board, current, next, hold, SHAPES, canHold);
  setAiTarget(move);
  setAiX(move.x);
  setAiRotation(move.rotation);
  setAiY(0);
}, [board, current, next, hold, canHold, isClearing]);



useEffect(() => {
  if (aiPhase !== 'waiting' || isClearing) return;

  const move = getBestMove(board, current, next, hold, SHAPES, canHold);
  if (!move) return;

  let newCurrent = current;
  let newHold = hold;
  let newNext = next;
  let usedHold = false;

  if (move.hold) {
    usedHold = true;
    newHold = current;

    if (hold) {
      newCurrent = hold;
      newNext = next;
    } else {
      newCurrent = next;
      newNext = randomTetromino(); // fallback
    }

    setHold(newHold);
    setCanHold(false);
  }

  const rotation = move.rotation % SHAPES[newCurrent.type].length;

  setCurrent(newCurrent);
  setNext(newNext);
  setAiTarget({
    type: newCurrent.type,
    x: move.x,
    y: 0,
    rotation,
    hold: usedHold,
  });

  setAiPhase('dropping');
}, [aiPhase, board, current, next, hold, canHold, isClearing]);


useEffect(() => {
  if (aiPhase !== 'dropping' || !aiTarget) return;

  const shape = SHAPES[aiTarget.type][aiTarget.rotation]; // ✅



  if (!checkCollision(board, shape, aiTarget.x, aiTarget.y + 1)) {
    const dropTimeout = setTimeout(() => {
      setAiTarget(prev => ({ ...prev, y: prev.y + 1 }));
    }, 50);
    return () => clearTimeout(dropTimeout);
  }

  // 落地
  const newBoard = merge(board, shape, aiTarget.x, aiTarget.y, getTetrominoId(aiTarget.type)); // ✅

  setBoard(newBoard);
  setAiPhase('settling');

}, [aiTarget, aiPhase, board]);

useEffect(() => {
  if (aiPhase !== 'settling') return;

  const fullRows = getFullRows(board);
  if (fullRows.length > 0) {
    setClearingRows(fullRows);
    setIsClearing(true);

    setTimeout(() => {
      const filtered = board.filter((_, i) => !fullRows.includes(i));
      while (filtered.length < ROWS) filtered.unshift(new Array(COLS).fill(0));
      setBoard(filtered);
      setClearingRows([]);
      setIsClearing(false);
    }, 400);
  }

  const nextTetromino = randomTetromino();

  let newHold = hold;
  let newCurrent;

  if (aiTarget.hold) {
    newHold = current;

    if (hold) {
      newCurrent = hold;
      setNext(nextTetromino); // 只要從 hold 拿出來用，就要補一個 next
    } else {
      newCurrent = next;
      setNext(nextTetromino); // fallback 也要補
    }

  } else {
    newCurrent = next;
    setNext(nextTetromino);
  }

  setHold(newHold);
  setCurrent(newCurrent);
  setCanHold(!aiTarget.hold);
  setCurrentRotation(0);
  setAiTarget(null);
  setAiPhase('waiting');
}, [aiPhase]);

  return (
    <div className="AI-tetris-container">
        <div className="side-box">
            <div className="hold-box">
                <p>Hold:</p>
                {getShape(hold).map((row, i) => (
                    <div key={i} className="row">
                    {row.map((val, j) => (
                        <div key={j} className={`cell type-${val}`} />
                    ))}
                    </div>
                ))}
            </div>
        </div>
        
        <div className="tetris-wrapper">
            <div className="tetris-board">
            {displayBoard.map((row, rowIndex) => (
                <div className="row" key={rowIndex}>
                    {row.map((cell, colIndex) => {
                    const isClearingCell = clearingRows.includes(rowIndex);
                    return (
                        <div
                        key={colIndex}
                        className={`cell type-${cell} ${isClearingCell ? 'clear-animation' : ''}`}
                        />
                    );
                    })}
                </div>
                ))}

            </div>
        </div>
        <div className="side-box">
            <div className="next-box">
                <p>Next:</p>
                {getShape(next).map((row, i) => (
                    <div key={i} className="row">
                    {row.map((val, j) => (
                        <div key={j} className={`cell type-${val}`} />
                    ))}
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}
