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
  const [clearingRows, setClearingRows] = useState([]);
  const [isClearing, setIsClearing] = useState(false);
  const [aiX, setAiX] = useState(0);
  const [aiRotation, setAiRotation] = useState(0);
  const [aiTarget, setAiTarget] = useState(null); // 存目標動作（AI的Move結果）
  const [aiPhase, setAiPhase] = useState('waiting'); // 'waiting' | 'dropping' | 'settling'
  const [aiHoldDone, setAiHoldDone] = useState(false);
  const [aiDropping, setAiDropping] = useState(false);

  useEffect(() => {
    // Reset 所有狀態
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    setCurrent(randomTetromino());
    setNext(randomTetromino());
    setHold(null);
    setCanHold(true);
    setClearingRows([]);
    setIsClearing(false);
    setAiX(0);
    setAiRotation(0);
    setAiTarget(null);
    setAiPhase('waiting');
  }, [resetKey]);

  function getInitialX(shape) {
    return Math.floor((COLS - shape[0].length) / 2);
  }


  function checkCollision(board, shape, x, y) {
      if (!shape || !Array.isArray(shape) || shape.length === 0) return true; // 如果 shape 無效，視為碰撞
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
    const shape = SHAPES[aiTarget.type][aiRotation];
    shape.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          const x = aiX + c;
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
    if (!started || isGameOver || aiPhase !== 'waiting' || isClearing) return;

    const move = getBestMove(board, current, next, hold, SHAPES, canHold);
    if (!move) return;

    // 原本的 current 還是 current
    const pieceBeforeHold = current;

    // AI 預計最終要落下的那塊
    const pieceAfterHold = move.hold ? (hold ?? next) : current;

    const rotation = move.rotation % SHAPES[pieceBeforeHold.type].length;
    const shape = SHAPES[pieceBeforeHold.type][rotation]; // 👈 使用「還沒換的方塊」

    const initX = getInitialX(shape);

    setAiTarget({
      type: pieceBeforeHold.type,  // 顯示目前移動中的方塊
      x: move.x,
      y: 0,
      rotation,
      hold: move.hold,
      finalType: move.hold ? (hold?.type ?? next.type) : next.type  // 這是 hold 完後會成為 current 的類型
    });

    setAiX(initX);
    setAiRotation(0);
    setAiHoldDone(false);
    setAiDropping(false);
    setAiPhase('moving');

  }, [aiPhase, started, isGameOver, board, current, next, hold, canHold, isClearing]);



  useEffect(() => {
    if (!started || isGameOver || aiPhase !== 'dropping' || !aiTarget) return;

    const shape = SHAPES[aiTarget.type][aiRotation];


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
  }, [aiPhase, started, aiTarget, board]);



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
        }, 200);
    }

    // 更新 hold 和 current 的邏輯
    const updatedCurrent = aiTarget.hold ? (hold ?? next) : next;

    // 檢查新方塊是否能放下（如果不能，就是 Game Over）
    const newShape = SHAPES[updatedCurrent.type][0];
    const collision = checkCollision(board, newShape, 3, 0); // 3 是大約中央位置

    if (collision) {
        onGameOver?.();  // 通知 Game Over
        return;          // 不再繼續遊戲
    }

    if (!aiTarget.hold) {
      // 只有沒用 hold 的情況才交換
      setCurrent(next);
      setNext(randomTetromino());
      setCanHold(true);
    }


    // 在進行 hold 操作時，更新 hold 和 current
    setNext(randomTetromino()); // 更新 next
    // setCanHold(!aiTarget.hold); // 只有在沒有進行 hold 操作時才能 hold
    setAiTarget(null);
    setAiPhase('waiting');  // 改回等待狀態
}, [aiPhase, started, board, current, next, hold, canHold, isClearing, aiTarget, onGameOver]);



useEffect(() => {
  if (!started || isGameOver || !aiTarget) return;

  if (aiPhase === 'moving') {

    // 先旋轉
    if (aiRotation !== aiTarget.rotation) {
      const rotationCount = SHAPES[aiTarget.type].length;
      // 簡單往目標旋轉角度走
      const nextRotation = (aiRotation + 1) % rotationCount;
      const timer = setTimeout(() => setAiRotation(nextRotation), 150);
      return () => clearTimeout(timer);
    }

    // 再左右移動
    if (aiX !== aiTarget.x) {
      const step = aiX < aiTarget.x ? 1 : -1;
      const timer = setTimeout(() => setAiX(aiX + step), 100); // 控制移動速度
      return () => clearTimeout(timer);
    }

    //我希望的是先讓將要HOLD的方塊先顯示在遊戲區 停頓一段時間後(這段也要下落處理)才進行HOLD(把原本HOLD的方塊和現在的方塊做交換)，然後才將現在(原本是HOLD)的方塊進行下落處理 讓AI有一個類似於人類思考的過程

    if (aiTarget.hold && !aiHoldDone) {
      setAiHoldDone(true); // ✅ 防止重複
      setAiPhase('delaying-hold'); // ✅ 先暫停，進入 delay 階段
      return;
    }


    // 以上動作完成後進入下落階段
    setAiDropping(true);
    setAiPhase('dropping');
  }

  if (aiPhase === 'dropping' && aiDropping) {
    const shape = SHAPES[aiTarget.type][aiRotation];
    if (!checkCollision(board, shape, aiX, aiTarget.y + 1)) {
      const timer = setTimeout(() => {
        setAiTarget(prev => ({ ...prev, y: prev.y + 1 }));
      }, 50); // 下落速度
      return () => clearTimeout(timer);
    }

    // 落地
    const newBoard = merge(board, shape, aiX, aiTarget.y, getTetrominoId(aiTarget.type));
    setBoard(newBoard);
    setAiPhase('settling');
    setAiDropping(false);
  }
}, [aiX, aiRotation, aiHoldDone, aiDropping, aiPhase, aiTarget, board, started, isGameOver]);


const [delayTick, setDelayTick] = useState(0); // 控制延遲下落

useEffect(() => {
  if (aiPhase !== 'delaying-hold' || !aiTarget) return;

  const shape = SHAPES[aiTarget.type][aiRotation];

  if (delayTick >= 5) {
    completeHold();
    return;
  }

  if (!checkCollision(board, shape, aiX, aiTarget.y + 1)) {
    const timer = setTimeout(() => {
      setAiTarget(prev => ({ ...prev, y: prev.y + 1 }));
      setDelayTick(prev => prev + 1);
    }, 50); // ✅ 控制這裡的速度來決定整體停頓感
    return () => clearTimeout(timer);
  }

  // 已經落地也結束等待，進入真正的 hold
  completeHold();
}, [aiPhase, aiTarget, aiRotation, board, aiX, delayTick]);


function completeHold() {
  const usedFromNext = hold === null; // 只有當 hold 是空的，current 才從 next 來

  setHold(current); // 將 current 放進 hold

  setCurrent({ type: aiTarget.finalType }); // 使用 AI 計算的目標方塊作為 current

  if (usedFromNext) {
    setNext(randomTetromino()); // ✅ 只有真的用了 next 才更新
  }

  setCanHold(false);     // 下一回合不能再 Hold
  setAiTarget(null);     // 清除目標
  setAiHoldDone(false);  // 重設 hold 狀態
  setDelayTick(0);       // 重設延遲次數
  setAiPhase('waiting'); // 回到等待 AI 做出決策的階段
}




return (
  <div className="AI-tetris-container">
    <div className="side-box">
      <div className={`hold-box ${aiHoldDone ? 'hold-animation' : ''}`}>
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