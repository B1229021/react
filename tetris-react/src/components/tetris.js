import React, { useState, useEffect, useRef } from 'react';
import './tetris.css';

const ROWS = 20;
const COLS = 10;
const EMPTY = 0;

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
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const audioRef = useRef(null);

  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState({
    shape: getRandomShape(),
    x: 3,
    y: 0,
  });
  const [holdPiece, setHoldPiece] = useState(null);
  const [hasHeld, setHasHeld] = useState(false);
  const [nextPiece, setNextPiece] = useState(getRandomShape());

  const gameInterval = useRef(null);

  const restartGame = () => {
    setScore(0);
    setNextPiece(getRandomShape());
    setBoard(createEmptyBoard());
    setCurrentPiece({ shape: getRandomShape(), x: 3, y: 0 });
    setHoldPiece(null);
    setHasHeld(false);
    setIsGameOver(false);
    if (gameInterval.current) clearInterval(gameInterval.current);
    gameInterval.current = setInterval(drop, 500);
    fadeInAudio(); // 加這行淡入音樂
  };

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
    } else {
      setHasHeld(false);
      const newBoard = merge(board, currentPiece);
      clearLines(newBoard);
      const newShape = getRandomShape();
      const newPiece = { shape: newShape, x: 3, y: 0 };
      if (!isValidMove(newShape, 3, 0)) {
        setIsGameOver(true);
        clearInterval(gameInterval.current);
        return;
      }
      setCurrentPiece(newPiece);
      setNextPiece(getRandomShape());
    }
  };

  const clearLines = (newBoard) => {
    const updatedBoard = newBoard.filter(row => row.some(cell => cell === EMPTY));
    const linesCleared = ROWS - updatedBoard.length;
    const pointsTable = [0, 100, 300, 500, 800];
    if (linesCleared > 0) setScore(prev => prev + pointsTable[linesCleared]);
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
    while (isValidMove(shape, x, y + 1)) y += 1;
    setHasHeld(false);
    const droppedPiece = { shape, x, y };
    const newBoard = merge(board, droppedPiece);
    clearLines(newBoard);
    const newPiece = { shape: nextPiece, x: 3, y: 0 };
    if (!isValidMove(newPiece.shape, newPiece.x, newPiece.y)) {
      setIsGameOver(true);
      clearInterval(gameInterval.current);
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
        setCurrentPiece({ shape: rotatedShape, x: x + offset, y });
        return;
      }
    }
  };


  const handleHold = () => {
    if (hasHeld) return;
    const newCurrent = holdPiece
      ? { shape: holdPiece, x: 3, y: 0 }
      : { shape: getRandomShape(), x: 3, y: 0 };
    setHoldPiece(currentPiece.shape);
    setCurrentPiece(newCurrent);
    setHasHeld(true);
  };

  const handleKeyDown = e => {
    e.preventDefault();
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
    if (e.key === 'ArrowDown') drop();
    if (e.ctrlKey) rotatePiece();
    if (e.key === 'Shift') handleHold();
    if (e.key === 'ArrowUp') rotatePieceCounterClockwise();
    if (e.code === 'Space') hardDrop();
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

  return !started ? (
      <div className="game-start">
        <h2>準備開始遊戲！</h2>
        <button
          onClick={() => {
            setStarted(true);
            restartGame();

            // 由使用者互動觸發播放，避免瀏覽器阻擋
            // if (audioRef.current) {
            //   audioRef.current.currentTime = 0;
            //   audioRef.current.play().catch(err => {
            //     console.warn("無法播放音樂：", err);
            //   });
            // }
          }}
        >
          開始遊戲
        </button>
      </div>
    ) : (
      <>
      {/* 背景音樂 */}
      <audio ref={audioRef} src="/bgm.mp3" loop />

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
          {isGameOver && (
            <div className="game-over">
              <h2>Game Over</h2>
              <button onClick={() => {
                  fadeInAudio();
                  restartGame();
                }}>Restart</button>
            </div>
          )}
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
          </div>
        </div>
      </div>
      </>
  );
};

export default Tetris;
