import React, { useEffect, useState } from 'react'; 
import Tetris from './components/tetris';
import AI from './components/AIboard';

function App() {
  const [started, setStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [aiResetKey, setAiResetKey] = useState(0); // 加這行
  const [playerGarbage, setPlayerGarbage] = useState(0);
  const [aiGarbage, setAiGarbage] = useState(0);

  // 玩家清除行，AI 要吃垃圾
  const handlePlayerLinesCleared = (count) => {
    if (count >= 2) {
      setAiGarbage(prev => prev + (count - 1));
    }
  };

  // AI 清除行，玩家要吃垃圾
  const handleAiLinesCleared = (count) => {
    if (count >= 2) {
      setPlayerGarbage(prev => prev + (count - 1));
    }
  };

  const startGame = () => {
    setStarted(true);
    setIsGameOver(false);
  };

  const endGame = () => {
    setIsGameOver(true);
  };

  const restartGame = () => {
    setAiGarbage(0);
    setPlayerGarbage(0);
    setIsGameOver(false);
    setStarted(true);
    setAiResetKey(prev => prev + 1); // 通知 AI 要重啟
  };

  
  return (
    <div className="App">
      {!started ? (
        <div className="game-start">
          <h2>準備開始遊戲！</h2>
          <button onClick={startGame}>開始遊戲</button>
        </div>
      ) : (
        <>
          <Tetris
            started={started}
            isGameOver={isGameOver}
            setIsGameOver={endGame}
            restartGame={restartGame}
            onLinesCleared={handlePlayerLinesCleared}
            garbageRows={playerGarbage}
          />

          <AI
            started={started}
            isGameOver={isGameOver}
            resetKey={aiResetKey}
            onGameOver={endGame}
            onLinesCleared={handleAiLinesCleared}
            garbageRows={aiGarbage}
          />
        </>
      )}
    </div>
  );
}

export default App;
