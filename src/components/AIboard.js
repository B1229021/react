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

let bag = [];

// 重新洗牌
function refillBag() {
  bag = [...TYPES].sort(() => Math.random() - 0.5);
}

function getNextShapeKey() {
  if (bag.length === 0) refillBag();
  return bag.pop(); // 從 bag 中拿一個
}

function randomTetromino() {
  const key = getNextShapeKey();
  return { type: SHAPES[key] ? key : 'I' };
}



export default function AIBoard({ started, isGameOver, resetKey, onGameOver }) {
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

  useEffect(() => {
    // Reset 所有狀態
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setCurrent(randomTetromino());
    setNext(randomTetromino());
    setHold(null);
    setCanHold(true);
    setCurrentRotation(0);
    setClearingRows([]);
    setIsClearing(false);
    setAiX(0);
    setAiY(0);
    setAiRotation(0);
    setAiTarget(null);
    setAiPhase('waiting');
  }, [resetKey]);


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
    if (!started || isGameOver || isClearing || aiTarget) return;

    const move = getBestMove(board, current, next, hold, SHAPES, canHold);
    setAiTarget(move);
    setAiX(move.x);
    setAiRotation(move.rotation);
    setAiY(0);
  }, [board, current, next, hold, canHold, isClearing, started, isGameOver]);




  useEffect(() => {
    if (!started || isGameOver || aiPhase !== 'waiting' || isClearing) return;

    const move = getBestMove(board, current, next, hold, SHAPES, canHold);
    if (!move) return;

    const piece = move.hold ? (hold ?? next) : current;
    const rotation = move.rotation % SHAPES[piece.type].length;

    setAiTarget({
        type: piece.type,
        x: move.x,
        y: 0,
        rotation,
        hold: move.hold,
    });

    setAiPhase('dropping');
  }, [aiPhase, started, aiPhase, board, current, next, hold, canHold, isClearing]);


  useEffect(() => {
    if (!started || isGameOver || aiPhase !== 'dropping' || !aiTarget) return;

    const shape = SHAPES[aiTarget.type][aiTarget.rotation];

    if (!checkCollision(board, shape, aiTarget.x, aiTarget.y + 1)) {
        const dropTimeout = setTimeout(() => {
        setAiTarget(prev => ({ ...prev, y: prev.y + 1 }));
        }, 150);     //調整ai下落速度，預設為150
        return () => clearTimeout(dropTimeout);
    }

    // 落地
    const newBoard = merge(board, shape, aiTarget.x, aiTarget.y, getTetrominoId(aiTarget.type));

    setBoard(newBoard);
    setAiPhase('settling');
  }, [aiPhase, started, aiTarget, aiPhase, board]);

  useEffect(() => {
    if (!started || isGameOver || aiPhase !== 'settling') return;

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

    // ✅ 修正 hold 與 current 的更新邏輯
    const updatedHold = aiTarget.hold ? current : hold;
    const updatedCurrent = aiTarget.hold ? (hold ?? next) : next;
    const nextTetromino = randomTetromino();

    // ❗️這裡檢查新方塊是否能放下（如果不能，就是 Game Over）
    const newShape = SHAPES[updatedCurrent.type][0];
    const collision = checkCollision(board, newShape, 3, 0); // 3 是大約中央位置

    if (collision) {
        onGameOver?.();  // ✅ 通知 App.js
        return;          // ✅ 不再繼續遊戲
    }

    setHold(updatedHold);
    setCurrent(updatedCurrent);
    setNext(nextTetromino);
    setCanHold(!aiTarget.hold);
    setCurrentRotation(0);
    setAiTarget(null);
    setAiPhase('waiting');
  }, [aiPhase, started]);



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