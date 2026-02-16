import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Room from './components/Room';
import GameBoard from './components/GameBoard';

import FourKindBoard from './components/FourKindBoard';
import IPLDraftBoard from './components/IPLDraftBoard';

const AppContent = () => {
  const { gameState } = useGame();
  
  if (gameState.gameStatus === 'WAITING') {
    return <Room />;
  }

  if (gameState.gameType === 'four_kind') return <FourKindBoard />;
  if (gameState.gameType === 'ipl_draft') return <IPLDraftBoard />;
  
  return <GameBoard />;
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
