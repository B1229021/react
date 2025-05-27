import React, { useState, useEffect, useRef } from 'react';
import './tetris.css';

const ROWS = 20;
const COLS = 10;
const EMPTY = 0;
const recentShapeKeys = []; // 取代 recentShapesRef.current

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

const createEmptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

const useAnimationFrame = (callback) => {
  const requestRef = useRef();
  const previousTimeRef = useRef();

  useEffect(() => {
    const animate = (time) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callback(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [callback]);
};

const getNextShapeKey = () => {
  const keys = Object.keys(SHAPES);

  // 統計最近的出現次數
  const countMap = {};
  for (let key of recentShapeKeys) {
    countMap[key] = (countMap[key] || 0) + 1;
  }

  // 過濾掉已出現 2 次的形狀
  const filtered = keys.filter(k => (countMap[k] || 0) < 2);

  const pool = filtered.length > 0 ? filtered : keys;
  const chosenKey = pool[Math.floor(Math.random() * pool.length)];

  // 更新最近方塊紀錄
  recentShapeKeys.push(chosenKey);
  if (recentShapeKeys.length > 9) recentShapeKeys.shift();

  return chosenKey;
};

const getRandomShape = () => SHAPES[getNextShapeKey()];


const Tetris = ({ started, isGameOver, setIsGameOver, restartGame, onLinesCleared, garbageRows }) => {
  const [score, setScore] = useState(0);
  const audioRef = useRef(null);
  const [dropTime, setDropTime] = useState(500); // 預設 500ms 一次
  const dropCounterRef = useRef(0);              // 累加計時器
  const isSoftDropping = useRef(false);          // 控制是否快速下落
  const LOCK_DELAY = 500; // 可調整為 300 ~ 500ms
  const lockTimerRef = useRef(null);
  const isLockDelayed = useRef(false);
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState(() => ({
    shape: getRandomShape(),
    x: 3,
    y: 0,
  }));
  const [holdPiece, setHoldPiece] = useState(null);
  const [hasHeld, setHasHeld] = useState(false);
  const [nextPiece, setNextPiece] = useState(() => getRandomShape());

  const handlerestart = () => {
    setScore(0);
    setNextPiece(getRandomShape());
    setBoard(createEmptyBoard());
    setCurrentPiece({ shape: getRandomShape(), x: 3, y: 0 });
    setHoldPiece(null);
    setHasHeld(false);
    setIsGameOver(false);
    fadeInAudio();
    restartGame();
    fadeInAudio(); // 加這行淡入音樂
  };

  const [highScore, setHighScore] = useState(() => {
    return Number(localStorage.getItem('tetris-highscore')) || 0;
  });


  const fadeInAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0;
    audio.play().catch(err => {
      console.warn("音樂播放失敗", err);
    });

    const fadeInInterval = setInterval(() => {
      if (audio.volume < 0.95) {
        audio.volume += 0.05;
      } else {
        audio.volume = 1;
        clearInterval(fadeInInterval);
      }
    }, 100); // 每 100ms 音量增加
  };

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

  const isValidMove = (shape, x, y) =>
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

  const drop = () => {
    const { shape, x, y } = currentPiece;
    const newY = y + 1;

    if (isValidMove(shape, x, newY)) {
      setCurrentPiece({ shape, x, y: newY });
      cancelLockDelay(); // 若能下落，取消 lock timer
    } else {
      if (!isLockDelayed.current) {
        startLockDelay(); // 進入延遲鎖定狀態
      }
    }
  };

  const startLockDelay = () => {
    isLockDelayed.current = true;
    lockTimerRef.current = setTimeout(() => {
      lockPiece(); // 正式鎖定方塊
      isLockDelayed.current = false;
    }, LOCK_DELAY);
  };

  const cancelLockDelay = () => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
      isLockDelayed.current = false;
    }
  };

  const lockPiece = () => {
    setHasHeld(false);
    const newBoard = merge(board, currentPiece);
    clearLines(newBoard);
    const newShape = nextPiece;
    const newPiece = { shape: newShape, x: 3, y: 0 };

    if (!isValidMove(newShape, 3, 0)) {
      setIsGameOver(true);
       return;
    }

    setBoard(newBoard);
    setCurrentPiece(newPiece);
    setNextPiece(getRandomShape());
  };

  useAnimationFrame((deltaTime) => {
    if (isGameOver || !started) return;

    dropCounterRef.current += deltaTime;
    const interval = isSoftDropping.current ? 50 : dropTime;

    if (dropCounterRef.current > interval) {
      drop();
      dropCounterRef.current = 0;
    }
  });

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('tetris-highscore', score);
    }
  }, [score, highScore]);

  useEffect(() => {
    if (garbageRows > 0) {
      setBoard(prev => {
        const newBoard = [...prev.slice(garbageRows)]; // 移除最上面幾行
        for (let i = 0; i < garbageRows; i++) {
          const row = Array(COLS).fill(8); // 8 表示垃圾行
          const hole = Math.floor(Math.random() * COLS);
          row[hole] = 0; // 留一個洞
          newBoard.push(row);
        }
        return newBoard;
      });
    }
  }, [garbageRows]);


  const clearLines = (newBoard) => {
    const linesToClear = [];

    newBoard.forEach((row, i) => {
      if (row.every(cell => cell !== EMPTY)) {
        linesToClear.push(i);
      }
    });

    if (linesToClear.length === 0) {
      setBoard(newBoard);
      return;
    }

    // 動畫標記
    const animatedBoard = newBoard.map((row, i) =>
      linesToClear.includes(i) ? row.map(() => -1) : row
    );

    setBoard(animatedBoard);

    // 加分邏輯
    const pointsTable = [0, 100, 300, 500, 800];
    const gained = pointsTable[linesToClear.length];
    setScore(prev => prev + gained);

    // 回報給父層
    if (onLinesCleared) {
      onLinesCleared(linesToClear.length);
    }

    // 延遲清除
    setTimeout(() => {
      const updatedBoard = newBoard.filter((_, i) => !linesToClear.includes(i));
      while (updatedBoard.length < ROWS) {
        updatedBoard.unshift(Array(COLS).fill(EMPTY));
      }
      setBoard(updatedBoard);
    }, 200);
  };


  const move = dir => {
    const { shape, x, y } = currentPiece;
    const newX = x + dir;
    if (isValidMove(shape, newX, y)) {
      cancelLockDelay(); // 移動時取消鎖定倒數
      setCurrentPiece({ shape, x: newX, y });
    }
  };

  const hardDrop = () => {
    let { shape, x, y } = currentPiece;
    while (isValidMove(shape, x, y + 1)) y += 1;
    setHasHeld(false);
    const droppedPiece = { shape, x, y };
    const newBoard = merge(board, droppedPiece);
    clearLines(newBoard);
    const newPiece = { shape: nextPiece, x: 3, y: 0 };
    if (!isValidMove(newPiece.shape, newPiece.x, newPiece.y)) {
      setIsGameOver(true);
      return;
    }
    setCurrentPiece(newPiece);
    setNextPiece(getRandomShape());
  };

  const rotatePiece = () => {
    const { shape, x, y } = currentPiece;
    const rotatedShape = rotate(shape);

    // 嘗試多個偏移量 (包含不動、左移、右移、更多右移)
    const offsets = [0, -1, 1, -2, 2];

    for (let offset of offsets) {
      if (isValidMove(rotatedShape, x + offset, y)) {
        cancelLockDelay(); // 移動時取消鎖定倒數
        setCurrentPiece({ shape: rotatedShape, x: x + offset, y });
        return; // 成功旋轉後就結束
      }
    }
  };

  const rotateCounterClockwise = (shape) => rotate(rotate(rotate(shape)));

  const rotatePieceCounterClockwise = () => {
    const { shape, x, y } = currentPiece;
    const rotatedShape = rotateCounterClockwise(shape);
    const offsets = [0, -1, 1, -2, 2];

    for (let offset of offsets) {
      if (isValidMove(rotatedShape, x + offset, y)) {
        cancelLockDelay(); // 移動時取消鎖定倒數
        setCurrentPiece({ shape: rotatedShape, x: x + offset, y });
        return;
      }
    }
  };

  const handleHold = () => {
    if (hasHeld) return;
    const newCurrent = holdPiece
      ? { shape: holdPiece, x: 3, y: 0 }
      : { shape: nextPiece, x: 3, y: 0 };
    setHoldPiece(currentPiece.shape);
    setCurrentPiece(newCurrent);
    if (!holdPiece)
      setNextPiece(getRandomShape());
    setHasHeld(true);
  };

  const handleKeyUp = e => {
    if (e.key === 'ArrowDown') {
      isSoftDropping.current = false;
    }
  };

  const handleKeyDown = e => {
    e.preventDefault();
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
    if (e.key === 'ArrowDown') {
      isSoftDropping.current = true;
    }
    if (e.ctrlKey) rotatePiece();
    if (e.key === 'Shift') handleHold();
    if (e.key === 'ArrowUp') rotatePieceCounterClockwise();
    if (e.code === 'Space') hardDrop();
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  });


  const renderCell = (val, i) => {
    const className =
      val === -1 ? 'cell clear-animation' : `cell type-${val}`;
    return <div key={i} className={className} />;
  };


  const renderBoard = () => {
    const displayBoard = merge(board, currentPiece);
    return displayBoard.map((row, i) => (
      <div key={i} className="row">{row.map(renderCell)}</div>
    ));
  };

  useEffect(() => {
    if (started && audioRef.current) {
      audioRef.current.volume = 1;
      audioRef.current.play().catch((err) => {
        console.warn("音樂播放失敗", err);
      });
    }
  }, [started]);

  useEffect(() => {
    if (isGameOver && audioRef.current) {
      let fadeOutInterval = setInterval(() => {
        if (audioRef.current.volume > 0.05) {
          audioRef.current.volume -= 0.05;
        } else {
          audioRef.current.volume = 0;
          audioRef.current.pause();
          clearInterval(fadeOutInterval);
        }
      }, 100);
    }
  }, [isGameOver]);

  return (
      <>
      {/* 背景音樂 */}
      <audio ref={audioRef} src="/bgm.mp3" loop />

      {isGameOver && (
        <div className="game-over">
          <h2>Game Over</h2>
          <button onClick={() => {

              handlerestart();
            }}>Restart</button>
        </div>
      )}

      <div className="tetris-container">
        <div className="side-box">
          <div className="hold-box">
            <h3>Hold</h3>
            {holdPiece ? holdPiece.map((row, i) => (
              <div key={i} className="row">
                {row.map((val, j) => (
                  <div key={j} className={`cell type-${val}`} />
                ))}
              </div>
            )) : (
              <div className="row"><div className="cell empty">—</div></div>
            )}
          </div>
        </div>

        <div className="tetris-wrapper">
          <div className="tetris-board">{renderBoard()}</div>
        </div>

        <div className="side-box">
          <div className="next-box">
            <h3>Next</h3>
            {nextPiece.map((row, i) => (
              <div key={i} className="row">
                {row.map((val, j) => (
                  <div key={j} className={`cell type-${val}`} />
                ))}
              </div>
            ))}
          </div>

          <div className="score-box">
            <h3>Score</h3>
            <p>{score}</p>
            <h4>High Score</h4>
            <p>{highScore}</p>
          </div>
        </div>
      </div>
      </>
  );
};

export default Tetris;
