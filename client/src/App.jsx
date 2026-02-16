import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Room from './components/Room';
import GameBoard from './components/GameBoard';

import FourKindBoard from './components/FourKindBoard';

const AppContent = () => {
  const { gameState } = useGame();
  
  if (gameState.gameStatus === 'WAITING') {
    return <Room />;
  }

  return gameState.gameType === 'four_kind' ? <FourKindBoard /> : <GameBoard />;
};

import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <GameProvider>
      <Toaster position="top-center" />
      <AppContent />
    </GameProvider>
  );
};

export default App;
