import React, { useEffect, useState } from 'react'; 
import Tetris from './components/tetris';
import AI from './components/AIboard';

function App() {
  const [started, setStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [aiResetKey, setAiResetKey] = useState(0); // 加這行

  const startGame = () => {
    setStarted(true);
    setIsGameOver(false);
  };

  const endGame = () => {
    setIsGameOver(true);
  };

  const restartGame = () => {
    setIsGameOver(false);
    setStarted(true);
    setAiResetKey(prev => prev + 1); // 通知 AI 要重啟
  };

  

  useEffect(() => {
    console.log(isGameOver); 
  }, [isGameOver]);

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
          />

          <AI
            started={started}
            isGameOver={isGameOver}
            resetKey={aiResetKey}
            onGameOver={endGame}
          />
        </>
      )}
    </div>
  );
}

export default App;
