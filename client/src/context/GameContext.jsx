import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState({
    roomCode: null,
    player: null,
    players: [],
    gameStatus: 'WAITING', // WAITING, PLAYING, RESULT
    myRole: null,
    turn: null,
    points: 0,
    cards: [], // For Four of a Kind
    gameType: 'raja_mantri'
  });

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server:', newSocket.id);
      
      // Try to rejoin
      const savedRoom = localStorage.getItem('rmcs_roomCode');
      const savedPlayer = localStorage.getItem('rmcs_playerId');
      
      if (savedRoom && savedPlayer) {
        console.log('Attempting cleanup/rejoin...', savedRoom);
        newSocket.emit('rejoinRoom', { roomCode: savedRoom, playerId: savedPlayer });
      }
    });

    newSocket.on('updatePlayers', (players) => {
      setGameState(prev => ({ ...prev, players }));
    });

    newSocket.on('joinedRoom', ({ roomCode, isHost, playerId, gameType, gameHistory }) => {
      // Save session
      localStorage.setItem('rmcs_roomCode', roomCode);
      localStorage.setItem('rmcs_playerId', playerId);
      
      setGameState(prev => ({ 
        ...prev, 
        roomCode, 
        isHost, 
        player: { _id: playerId }, // minimal player info
        gameType: gameType || 'raja_mantri',
        gameHistory: gameHistory || []
      }));
    });

    newSocket.on('gameStarted', () => {
      setGameState(prev => ({ 
        ...prev, 
        gameStatus: 'PICKING',
        myRole: null, // Reset role for new round
        roundResult: null // Clear previous results
      }));
    });

    newSocket.on('revealRole', ({ role }) => {
      setGameState(prev => ({ ...prev, myRole: role }));
    });
    
    newSocket.on('playerPicked', ({ playerId }) => {
       // Optional: animate or show who picked
    });

    newSocket.on('updateGameState', ({ gameState, players }) => {
      setGameState(prev => ({ 
        ...prev, 
        gameStatus: gameState,
        players: players || prev.players // update players if provided (e.g. for points)
      }));
    });

    newSocket.on('roundResult', ({ players, correctGuess, sipahiName, chorName }) => {
       setGameState(prev => ({
         ...prev,
         gameStatus: 'RESULT',
         players,
         roundResult: { correctGuess, sipahiName, chorName }
       }));
    });
    
    newSocket.on('error', (msg) => {
      if (msg === 'Session expired' || msg === 'Room not found') {
        localStorage.removeItem('rmcs_roomCode');
        localStorage.removeItem('rmcs_playerId');
        window.location.reload(); // Force reset to home
      }
      toast.error(msg);
    });

    newSocket.on('gameEnded', ({ winners } = {}) => {
      // If winners data is present, show Game Over screen
      if (winners) {
        setGameState(prev => ({
          ...prev,
          gameStatus: 'GAME_OVER',
          winners
        }));
        localStorage.removeItem('rmcs_roomCode');
        localStorage.removeItem('rmcs_playerId');
      } else {
        // Fallback for unexpected cases or if no winners sent
        toast.error('The host has ended the game.', { duration: 4000 });
        localStorage.removeItem('rmcs_roomCode');
        localStorage.removeItem('rmcs_playerId');
        setTimeout(() => window.location.reload(), 2000);
      }
    });

    // Four of a Kind Events
    newSocket.on('fourKindGameStarted', () => {
      setGameState(prev => ({ ...prev, gameStatus: 'PLAYING' }));
    });

    newSocket.on('updateHand', ({ cards }) => {
      setGameState(prev => ({ ...prev, cards }));
    });

    newSocket.on('updateTurn', ({ turnPlayerId, lastAction }) => {
        // You might want to store turnPlayerId in gameState
        setGameState(prev => ({ ...prev, turn: turnPlayerId }));
        if (lastAction) toast(lastAction);
    });

    newSocket.on('gameOver', ({ winner, cards, history }) => {
        setGameState(prev => ({ 
            ...prev, 
            gameStatus: 'FINISHED',
            roundWinner: winner,
            winnerCards: cards,
            gameHistory: history // Update history for Scorecard
        }));
        toast.success(`Game Over! Winner: ${winner}`);
    });

    return () => newSocket.close();
  }, []);

  const value = {
    socket,
    gameState,
    setGameState
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
