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
    <div className="h-screen bg-transparent p-4 gap-6 text-gray-200 flex overflow-hidden font-sans">
      {/* Left Side: Panels Stack */}
      <div className="flex-grow flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
        {/* Header Panel */}
        <header className="relative bg-[#1a1225] border border-[#3a2a4b] rounded-2xl p-6 flex justify-between items-start flex-shrink-0 shadow-2xl overflow-hidden">
          {/* Subtle top glow */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#e2c792]/40 to-transparent"></div>
          
          <div className="space-y-1 z-10">
            <h2 className="text-xs font-cinzel text-[#e2c792] tracking-[0.2em] uppercase">Raja Mantri Table</h2>
            <h1 className="text-3xl md:text-4xl font-playfair text-white tracking-wide uppercase">Room {gameState.roomCode}</h1>
            <div className="flex items-center gap-3 pt-3">
               <span className="text-[10px] md:text-xs font-bold text-black bg-[#e2c792] px-3 py-1 rounded-full uppercase tracking-wider">
                 Status: {gameState.gameStatus}
               </span>
               <span className="text-[10px] md:text-xs font-bold text-white bg-[#1a8571] px-3 py-1 rounded-full uppercase tracking-wider">
                 Role: {gameState.myRole?.name ? 'REVEALED' : 'HIDDEN'}
               </span>
            </div>
          </div>
          
          <div className="text-right flex items-center gap-3 z-10">
             <button 
               onClick={() => {
                 if (confirm('Are you sure you want to leave?')) {
                   socket.emit('leaveRoom', { roomCode: gameState.roomCode, playerId: gameState.player._id });
                   localStorage.removeItem('rmcs_roomCode');
                   localStorage.removeItem('rmcs_playerId');
                   window.location.reload();
                 }
               }}
               className="bg-[#b84a5b]/80 hover:bg-[#962f3f] text-white text-[11px] md:text-sm px-4 py-2 rounded-full transition-colors font-bold tracking-wider flex items-center justify-center border border-[#b84a5b]/50 shadow-md gap-2"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
               </svg>
               LEAVE
             </button>
             {gameState.isHost && (
               <button 
                 onClick={() => {
                   if (confirm('End game for everyone?')) {
                     socket.emit('endGame', { roomCode: gameState.roomCode });
                   }
                 }}
                 className="bg-[#b84a5b]/80 hover:bg-[#962f3f] text-white text-[11px] md:text-sm px-4 py-2 rounded-full transition-colors font-bold tracking-wider flex items-center justify-center border border-[#b84a5b]/50 shadow-md gap-2"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                 </svg>
                 END GAME
               </button>
             )}
          </div>
        </header>

        {/* Game Area Wrapper */}
        <div className="flex-grow flex flex-col gap-6">
           
           <VideoChat />

           {/* Cards Section */}
           {gameState.gameStatus === 'PICKING' && (
             <div className="bg-[#1a1225] border border-[#3a2a4b] rounded-2xl p-6 shadow-2xl relative">
               <div className="flex justify-between items-end mb-8 border-b border-[#3a2a4b]/60 pb-4">
                  <h2 className="text-2xl font-playfair text-white tracking-wide">Pick Your Card</h2>
                  <span className="text-[10px] md:text-xs font-cinzel text-[#e2c792] tracking-[0.2em] uppercase">Deal Phase</span>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
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
                        <p className="font-sans text-sm text-gray-300 tracking-wide">{p.username}</p>
                        <p className="text-teal-400/80 text-xs mt-1">Score: <span className="text-teal-400">{p.totalPoints}</span></p>
                        {p._id === gameState.player._id && gameState.myRole?.name && (
                          <p className="text-[#e2c792] text-xs mt-1 uppercase tracking-widest font-bold">(You)</p>
                        )}
                      </div>
                    </div>
                 ))}
               </div>
             </div>
           )}

           {gameState.gameStatus === 'GUESSING' && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09050e]/80 backdrop-blur-md p-4">
               <div className="w-full max-w-md bg-[#1a1225] border border-[#e2c792]/50 p-8 rounded-2xl text-center shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                  <h2 className="text-3xl font-playfair text-white tracking-wide mb-6">Guessing Phase</h2>
                  {gameState.myRole?.name === 'Sipahi' ? (
                    <div className="space-y-6">
                      <p className="text-xl font-cinzel text-[#e2c792] tracking-wider uppercase">Who is the Chor?</p>
                      <select 
                        className="w-full p-3 bg-[#09050e] border border-[#3a2a4b] rounded-xl text-gray-200 outline-none focus:border-[#e2c792]/50 transition-colors"
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
                        className="w-full bg-[#1a8571] hover:bg-[#136656] text-white px-6 py-3 rounded-full font-bold tracking-widest uppercase transition-transform hover:scale-[1.02] shadow-lg"
                      >
                        Submit Guess
                      </button>
                    </div>
                  ) : (
                    <p className="text-xl font-sans text-[#e2c792] animate-pulse tracking-wide font-medium">Sipahi is guessing...</p>
                  )}
               </div>
             </div>
           )}

           {gameState.gameStatus === 'RESULT' && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09050e]/80 backdrop-blur-md p-4">
               <div className="w-full max-w-2xl bg-[#1a1225] border border-[#e2c792]/50 p-8 rounded-2xl text-center space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto custom-scrollbar">
                  {/* ... existing result code ... */}
                  <h2 className="text-4xl font-playfair font-bold text-[#e2c792] tracking-wide">Round Over!</h2>
                  <p className="text-xl text-white font-sans">
                    {gameState.roundResult?.correctGuess ? "Sipahi caught the Chor!" : "Sipahi failed!"}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left p-6 bg-[#09050e] border border-[#3a2a4b]/50 rounded-xl">
                     <p className="text-gray-400 text-sm tracking-widest uppercase">Sipahi: <span className="font-bold text-white text-base ml-2">{gameState.roundResult?.sipahiName}</span></p>
                     <p className="text-gray-400 text-sm tracking-widest uppercase">Chor: <span className="font-bold text-white text-base ml-2">{gameState.roundResult?.chorName}</span></p>
                  </div>
                  
                  <h3 className="text-xl font-cinzel text-[#e2c792] tracking-[0.2em] mt-8 mb-4">Scoreboard</h3>
                  <div className="overflow-x-auto rounded-xl border border-[#3a2a4b]">
                    <table className="w-full text-left border-collapse bg-[#09050e]">
                      <thead>
                        <tr className="border-b border-[#3a2a4b] text-gray-500 text-xs tracking-wider uppercase">
                          <th className="p-4">Player</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Earned</th>
                          <th className="p-4 bg-[#1a1225]">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameState.players.map(p => (
                          <tr key={p._id} className="border-b border-[#3a2a4b]/50 last:border-0 hover:bg-[#1a1225]/40 transition-colors">
                            <td className="p-4 text-gray-200">{p.username}</td>
                            <td className="p-4 text-[#e2c792] font-semibold">{p.currRole}</td>
                            <td className="p-4 text-teal-400">+{p.currPoints}</td>
                            <td className="p-4 font-bold text-white bg-[#1a1225]">{p.totalPoints}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {gameState.isHost && (
                    <button 
                      onClick={() => socket.emit('nextRound', { roomCode: gameState.roomCode })}
                      className="mt-8 bg-[#1a8571] hover:bg-[#136656] text-white px-8 py-3 rounded-full font-bold tracking-widest uppercase w-full md:w-auto mx-auto block shadow-lg transition-transform hover:-translate-y-1"
                    >
                      Start Next Round
                    </button>
                  )}
                  {!gameState.isHost && (
                     <p className="text-gray-500 mt-6 animate-pulse font-sans tracking-wide">Waiting for host to start next round...</p>
                  )}
               </div>
             </div>
           )}

           {gameState.gameStatus === 'GAME_OVER' && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09050e]/90 backdrop-blur-lg p-4">
                <div className="w-full max-w-2xl flex flex-col items-center justify-center p-12 bg-[#1a1225] border border-[#e2c792]/60 rounded-2xl shadow-[0_0_50px_rgba(226,199,146,0.15)] text-center space-y-8 max-h-[95vh] overflow-y-auto custom-scrollbar">
                   <h1 className="text-5xl font-playfair font-black text-transparent bg-clip-text bg-gradient-to-r from-[#e2c792] to-[#c79a42] tracking-wider drop-shadow-lg">
                      GAME OVER
                   </h1>
                   
                   <div className="space-y-6 w-full">
                      <h2 className="text-sm font-cinzel text-gray-400 tracking-[0.3em] uppercase">Winner</h2>
                      {gameState.winners && gameState.winners.length > 0 && (
                         <div className="bg-gradient-to-br from-[#e2c792] to-[#c79a42] text-[#09050e] p-2 rounded-full w-40 h-40 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(226,199,146,0.3)] transform hover:scale-105 transition duration-500 border-4 border-[#1a1225]">
                            <span className="text-3xl font-playfair font-bold">{gameState.winners[0].username}</span>
                         </div>
                      )}
                      <p className="text-2xl font-bold text-teal-400 tracking-wide">
                         Score: {gameState.winners?.[0]?.totalPoints} <span className="text-sm text-gray-400 font-normal">pts</span>
                      </p>
                   </div>

                   <div className="w-full max-w-md mx-auto mt-8">
                      <h3 className="text-xs font-cinzel text-gray-500 tracking-[0.2em] mb-4 uppercase">Final Standings</h3>
                      <ul className="space-y-3">
                         {gameState.winners?.map((p, i) => (
                            <li key={i} className={`flex justify-between items-center p-4 rounded-xl border ${i === 0 ? 'bg-[#3a2a4b]/40 border-[#e2c792]/50' : 'bg-[#09050e] border-[#3a2a4b]'}`}>
                               <div className="flex items-center gap-4">
                                  <span className={`font-cinzel text-lg ${i === 0 ? 'text-[#e2c792]' : 'text-gray-500'}`}>#{i + 1}</span>
                                  <span className={`font-sans ${i === 0 ? 'text-white font-bold' : 'text-gray-300'}`}>{p.username}</span>
                               </div>
                               <span className={`font-bold ${i === 0 ? 'text-teal-400' : 'text-gray-400'}`}>{p.totalPoints} pts</span>
                            </li>
                         ))}
                      </ul>
                   </div>

                   <button 
                      onClick={() => window.location.reload()}
                      className="mt-8 bg-[#b84a5b] hover:bg-[#962f3f] text-white px-10 py-4 rounded-full font-bold tracking-widest uppercase shadow-lg transition-transform hover:-translate-y-1 w-full md:w-auto"
                   >
                      Back to Home
                   </button>
                </div>
              </div>
           )}

        </div>
      </div>

      {/* Right Side: Scoreboard & Chat Sidebar */}
      <div className="w-80 lg:w-96 h-full flex-shrink-0 flex flex-col gap-6">
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
