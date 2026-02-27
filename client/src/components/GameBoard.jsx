import React, { useState } from 'react';
import Card from './Card';
import Chat from './Chat';
import Scoreboard from './Scoreboard';
import VideoChat from './VideoChat';
import { useGame } from '../context/GameContext';

const GameBoard = () => {
  const { gameState, socket } = useGame();
  const [guess, setGuess] = useState(null);

  React.useEffect(() => {
    if (gameState.gameStatus === 'PICKING') {
      setGuess(null);
    }
  }, [gameState.gameStatus]);

  const handlePick = () => {
    if (gameState.gameStatus === 'PICKING' && !gameState.myRole) {
      socket.emit('pickCard', { roomCode: gameState.roomCode, playerId: gameState.player?._id });
    }
  };

  const submitGuess = () => {
    if (!guess) return;
    socket.emit('submitGuess', { 
      roomCode: gameState.roomCode, 
      sipahiId: gameState.player._id, 
      guessPlayerId: guess 
    });
  };

  return (
    <div className="h-screen bg-gray-950 p-4 gap-4 text-white flex overflow-hidden">
      {/* Left Side: Game Area Panel */}
      <div className="flex-grow flex flex-col bg-gray-900/80 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
        <header className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-200">Room: {gameState.roomCode}</h1>
             <p className="text-sm text-gray-400">Status: {gameState.gameStatus}</p>
          </div>
          <div className="text-right flex items-center gap-4">
             <p className="text-sm font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
               My Role: {gameState.myRole?.name || '???'}
             </p>
             <button 
               onClick={() => {
                 if (confirm('Are you sure you want to leave?')) {
                   socket.emit('leaveRoom', { roomCode: gameState.roomCode, playerId: gameState.player._id });
                   localStorage.removeItem('rmcs_roomCode');
                   localStorage.removeItem('rmcs_playerId');
                   window.location.reload();
                 }
               }}
               className="bg-red-600 hover:bg-red-700 text-sm px-3 py-1.5 rounded-lg transition-colors font-medium"
             >
               Leave Room
             </button>
             {gameState.isHost && (
               <button 
                 onClick={() => {
                   if (confirm('End game for everyone?')) {
                     socket.emit('endGame', { roomCode: gameState.roomCode });
                   }
                 }}
                 className="bg-red-900/50 hover:bg-red-900/80 text-red-200 text-sm px-3 py-1.5 rounded-lg border border-red-800 transition-colors font-medium"
               >
                 End Game
               </button>
             )}
          </div>
        </header>

        {/* Game Area Content */}
        <main className="flex-grow overflow-y-auto p-6 flex flex-col items-center space-y-8">
           
           <VideoChat />

           {/* Cards Section */}
           {gameState.gameStatus === 'PICKING' && (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
               {gameState.players.map((p, i) => (
                  <div key={p._id} className="flex flex-col items-center">
                    <Card 
                      role={p._id === gameState.player._id ? gameState.myRole : null} 
                      isRevealed={p._id === gameState.player._id && !!gameState.myRole?.name} 
                      onClick={() => {
                        if (p._id === gameState.player?._id) {
                            handlePick();
                        }
                      }}
                    />
                    <div className="mt-4 text-center">
                      <p className="font-bold text-lg">{p.username}</p>
                      <p className="text-yellow-400">Score: {p.totalPoints}</p>
                      {p._id === gameState.player._id && gameState.myRole?.name && (
                        <p className="text-green-400 text-sm">(You)</p>
                      )}
                    </div>
                  </div>
               ))}
             </div>
           )}

           {gameState.gameStatus === 'GUESSING' && (
             <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg text-center">
                <h2 className="text-2xl mb-4">Guessing Phase</h2>
                {gameState.myRole?.name === 'Sipahi' ? (
                  <div className="space-y-4">
                    <p className="text-lg">Who is the Chor?</p>
                    <select 
                      className="w-full p-2 bg-gray-700 rounded text-white"
                      onChange={(e) => setGuess(e.target.value)}
                    >
                      <option value="">Select Player</option>
                      {gameState.players
                        .filter(p => p._id !== gameState.player._id) 
                        .map(p => (
                          <option key={p._id} value={p._id}>{p.username}</option>
                        ))
                      }
                    </select>
                    <button 
                      onClick={submitGuess}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold"
                    >
                      Submit Guess
                    </button>
                  </div>
                ) : (
                  <p className="text-xl animate-pulse">Sipahi is guessing...</p>
                )}
             </div>
           )}

           {gameState.gameStatus === 'RESULT' && (
             <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg text-center space-y-4">
                {/* ... existing result code ... */}
                <h2 className="text-3xl font-bold text-yellow-400">Round Over!</h2>
                <p className="text-xl">
                  {gameState.roundResult?.correctGuess ? "Sipahi caught the Chor!" : "Sipahi failed!"}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left p-4 bg-gray-700 rounded">
                   <p>Sipahi: <span className="font-bold">{gameState.roundResult?.sipahiName}</span></p>
                   <p>Chor: <span className="font-bold">{gameState.roundResult?.chorName}</span></p>
                </div>
                
                <h3 className="text-2xl mt-4">Scoreboard</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="p-2">Player</th>
                        <th className="p-2">Role</th>
                        <th className="p-2">Points</th>
                        <th className="p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameState.players.map(p => (
                        <tr key={p._id} className="border-b border-gray-700">
                          <td className="p-2">{p.username}</td>
                          <td className="p-2 text-yellow-300">{p.currRole}</td>
                          <td className="p-2">{p.currPoints}</td>
                          <td className="p-2 font-bold">{p.totalPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {gameState.isHost && (
                  <button 
                    onClick={() => socket.emit('nextRound', { roomCode: gameState.roomCode })}
                    className="mt-6 bg-green-600 hover:bg-green-700 px-8 py-3 rounded font-bold text-xl"
                  >
                    Start Next Round
                  </button>
                )}
                {!gameState.isHost && (
                   <p className="text-gray-400 mt-4 animate-pulse">Waiting for host to start next round...</p>
                )}
             </div>
           )}

           {gameState.gameStatus === 'GAME_OVER' && (
              <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-xl shadow-2xl text-center space-y-6">
                 <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 animate-bounce">
                    GAME OVER
                 </h1>
                 
                 <div className="space-y-4">
                    <h2 className="text-3xl text-white">Winner</h2>
                    {gameState.winners && gameState.winners.length > 0 && (
                       <div className="bg-yellow-500 text-gray-900 p-6 rounded-full w-32 h-32 flex items-center justify-center mx-auto shadow-lg transform hover:scale-110 transition duration-300">
                          <span className="text-2xl font-bold">{gameState.winners[0].username}</span>
                       </div>
                    )}
                    <p className="text-xl text-yellow-300">
                       Score: {gameState.winners?.[0]?.totalPoints}
                    </p>
                 </div>

                 <div className="w-full mt-8">
                    <h3 className="text-2xl mb-4">Final Standings</h3>
                    <ul className="space-y-2">
                       {gameState.winners?.map((p, i) => (
                          <li key={i} className={`flex justify-between p-3 rounded ${i === 0 ? 'bg-yellow-600 font-bold' : 'bg-gray-700'}`}>
                             <span>#{i + 1} {p.username}</span>
                             <span>{p.totalPoints} pts</span>
                          </li>
                       ))}
                    </ul>
                 </div>

                 <button 
                    onClick={() => window.location.reload()}
                    className="mt-8 bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-full font-bold text-xl transition transform hover:-translate-y-1"
                 >
                    Back to Home
                 </button>
              </div>
           )}

        </main>
      </div>

      {/* Right Side: Scoreboard & Chat Sidebar */}
      <div className="w-80 h-full flex-shrink-0 flex flex-col gap-4">
        <div className="flex-1 min-h-0">
           <Scoreboard />
        </div>
        <div className="flex-1 min-h-0">
           <Chat />
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
