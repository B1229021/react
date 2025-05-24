import React from 'react';
import Tetris from './components/tetris';
import AI from './components/AIboard';

function App() {
  return (
    <div className="App">
      <Tetris/>
      <AI/>
    </div>
  );
}

export default App;