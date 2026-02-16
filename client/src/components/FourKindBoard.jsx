import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { toast } from 'react-hot-toast';
import { User, ArrowRight, Trophy, LogOut, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import Chat from './Chat';
import Scorecard from './Scorecard';
import confetti from 'canvas-confetti';
import useVideoChat from '../hooks/useVideoChat';
import { motion, AnimatePresence } from 'framer-motion';

const TimerRing = ({ duration, start, isTurn }) => {
    const [progress, setProgress] = useState(100);
    
    useEffect(() => {
        if (!start || !duration) return;
        
        const interval = setInterval(() => {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, duration - elapsed);
            const displayProgress = (remaining / duration) * 100;
            setProgress(displayProgress);

            if (remaining <= 0) clearInterval(interval);
        }, 100);

        return () => clearInterval(interval);
    }, [start, duration]);

    if (!isTurn) return null;

    return (
        <div className="absolute inset-0 z-0 pointer-events-none">
             <svg className="w-full h-full transform -rotate-90 scale-110" viewBox="0 0 100 100">
                 <circle
                     cx="50" cy="50" r="48"
                     fill="none"
                     stroke="#374151"
                     strokeWidth="4"
                 />
                 <motion.circle
                     cx="50" cy="50" r="48"
                     fill="none"
                     stroke={progress < 20 ? "#EF4444" : "#14B8A6"}
                     strokeWidth="4"
                     strokeDasharray="301.59"
                     strokeDashoffset={301.59 * (1 - progress / 100)}
                     strokeLinecap="round"
                 />
             </svg>
        </div>
    );
};

const VideoStream = ({ stream, isLocal, isMuted }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted={isLocal || isMuted} 
            className={`w-full h-full object-cover ${isLocal ? 'transform scale-x-[-1]' : ''}`} 
        />
    );
};

const FourKindBoard = () => {
  const { gameState, socket } = useGame();
  const { players, cards, turn, player: myPlayer } = gameState;
  
  // Video Chat Hook
  const { 
      localStream, remoteStreams, isMuted, isVideoOff, 
      toggleMute, toggleVideo 
  } = useVideoChat();

  console.log('FourKindBoard State:', { gameStatus: gameState.gameStatus, turn, playersCount: players.length, myPlayer });

  // Identify my index to rotate table so I am at bottom
  const myIndex = players.findIndex(p => p._id === myPlayer._id);
  
  // Rotate players array so myIndex is at 0 (bottom)
  const rotatedPlayers = [
    ...players.slice(myIndex),
    ...players.slice(0, myIndex)
  ];

  // Confetti Effect on Win
  useEffect(() => {
      if (gameState.gameStatus === 'FINISHED') {
          const duration = 5 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

          const randomInRange = (min, max) => Math.random() * (max - min) + min;

          const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
          }, 250);
      }
  }, [gameState.gameStatus]);

  const positions = ['bottom', 'left', 'top', 'right'];

  const getPositionStyle = (index) => {
    switch(index) {
      case 0: return "bottom-8 left-1/2 transform -translate-x-1/2"; 
      case 1: return "top-1/2 left-8 transform -translate-y-1/2"; 
      case 2: return "top-20 left-1/2 transform -translate-x-1/2"; // Moved down slightly
      case 3: return "top-1/2 right-8 transform -translate-y-1/2"; 
      default: return "";
    }
  };

  const handlePassCard = (card) => {
     if (gameState.turn !== myPlayer._id) return toast.error("Not your turn!");
     if (cards.length < 4) return toast.error("Not enough cards!");
     
     socket.emit('passCard', { 
         roomCode: gameState.roomCode, 
         card, 
         fromPlayerId: myPlayer._id 
     });
  };

  const checkWin = () => {
      socket.emit('checkWin', { roomCode: gameState.roomCode, playerId: myPlayer._id });
  };

  const startNextGame = () => {
      socket.emit('nextFourKindRound', { roomCode: gameState.roomCode });
  };

  const handleLeave = () => {
      if (confirm('Are you sure you want to leave the game?')) {
          socket.emit('leaveRoom', { roomCode: gameState.roomCode, playerId: myPlayer._id });
          localStorage.removeItem('rmcs_roomCode');
          localStorage.removeItem('rmcs_playerId');
          window.location.reload();
      }
  };

  return (
    <div className="h-screen bg-[#0a0b1e] flex overflow-hidden">
       
       {/* LEFT: Game Board (3/4 width) */}
       <div className="flex-grow relative border-r border-gray-800 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
          
          {/* Logo */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 opacity-80 hover:opacity-100 transition">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">4</span>
              </div>
              <span className="text-gray-400 font-bold text-sm tracking-wider">FOUR OF A KIND</span>
          </div>

          {/* Leave Button */}
          <button 
              onClick={handleLeave}
              className="absolute top-4 right-4 z-10 flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all"
          >
              <LogOut size={16} />
              <span className="text-sm font-bold">Leave</span>
          </button>

          {/* Center Info / Table */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-0">
               <div className="w-64 h-64 rounded-full border-4 border-gray-800 flex items-center justify-center bg-gray-900/80 backdrop-blur shadow-2xl relative">
                   {gameState.gameStatus === 'FINISHED' ? (
                       <div className="text-center animate-bounce">
                           <Trophy className="mx-auto text-yellow-400 mb-2" size={48} />
                           <p className="text-gray-300">Winner</p>
                           <p className="text-3xl font-bold text-yellow-500">{gameState.roundWinner}</p>
                           
                           {gameState.roundWinner === myPlayer.username && (
                               <button 
                                   onClick={startNextGame}
                                   className="mt-4 bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition"
                               >
                                   Start Next Game
                               </button>
                           )}
                       </div>
                   ) : (
                       gameState.turn ? (
                           <div className="text-center">
                               <p className="text-xs text-gray-500 uppercase tracking-widest">Current Turn</p>
                               <p className="text-2xl font-bold text-white mt-1">
                                   {players.find(p => p._id === gameState.turn)?.username || '...'}
                               </p>
                               <ArrowRight className="mx-auto mt-3 text-teal-500 animate-pulse" />
                           </div>
                       ) : 'Waiting...'
                   )}
               </div>
          </div>

          {/* Players */}
          {rotatedPlayers.map((p, i) => {
              const isMe = p._id === myPlayer._id;
              const isTurn = gameState.turn === p._id;
              const stream = isMe ? localStream : remoteStreams[p._id];
              
              return (
                <div key={p._id} className={`absolute ${getPositionStyle(i)} flex flex-col items-center transition-all duration-500 z-10`}>
                    
                <div key={p._id} className={`absolute ${getPositionStyle(i)} flex flex-col items-center transition-all duration-500 z-10`}>
                    
                    {/* Player Avatar / Video with Timer */}
                    <div className="relative">
                        <TimerRing 
                             duration={gameState.timer?.duration} 
                             start={gameState.timer?.start} 
                             isTurn={isTurn} 
                        />
                        
                        <div className={`
                            relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-2xl border-4
                            ${isTurn ? 'border-transparent shadow-teal-500/30 scale-105' : 'border-gray-700 bg-gray-800'}
                            transition-all duration-300 group
                        `}>
                            {stream ? (
                                <VideoStream stream={stream} isLocal={isMe} />
                            ) : (
                                <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center">
                                    <User className="text-gray-500 mb-2" size={40} />
                                    <p className="text-xs text-gray-500">No Video</p>
                                </div>
                            )}

                             {/* Name Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2 text-center">
                               <span className={`text-sm font-bold truncate block ${isTurn ? 'text-teal-400' : 'text-gray-200'}`}>
                                    {p.username} {isMe && '(You)'}
                               </span>
                            </div>

                            {/* Controls for Local User */}
                            {isMe && (
                               <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1 rounded-lg">
                                   <button onClick={toggleMute} className={`p-1.5 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                       {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                                   </button>
                                   <button onClick={toggleVideo} className={`p-1.5 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                       {isVideoOff ? <VideoOff size={14} /> : <Video size={14} />}
                                   </button>
                               </div>
                            )}
                            {!isMe && (
                                 <div className="absolute -top-2 -right-2 w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow ring-4 ring-[#0a0b1e] z-10">
                                     ?
                                 </div>
                            )}
                        </div>
                    </div>

                    {/* My Cards */}
                    {isMe && (
                        <div className="flex space-x-3 mt-6 perspective-1000 min-h-[160px]">
                            <AnimatePresence>
                                {cards.map((card, idx) => (
                                    <motion.button 
                                        key={`${card}-${idx}`} // Unique key for animation
                                        layout
                                        initial={{ opacity: 0, y: 50, scale: 0.5 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -50, scale: 0.5, transition: { duration: 0.2 } }}
                                        whileHover={{ y: -20, rotate: 2, scale: 1.1 }}
                                        onClick={() => handlePassCard(card)}
                                        disabled={!isTurn}
                                        className={`
                                            w-20 h-32 md:w-24 md:h-36 bg-white rounded-xl shadow-2xl border-2 border-gray-300
                                            flex items-center justify-center text-4xl md:text-5xl font-black text-gray-800
                                            cursor-pointer transform-gpu
                                            ${isTurn ? 'hover:shadow-teal-500/50 hover:border-teal-400' : 'opacity-80 cursor-not-allowed grayscale'}
                                        `}
                                    >
                                        {card}
                                    </motion.button>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
              );
          })}

          {/* Claim Victory Button (My Turn & 4 Cards & Match) */}
          {gameState.gameStatus === 'PLAYING' && cards.length === 4 && (
               <div className="absolute bottom-40 right-10">
                   <button 
                      onClick={checkWin}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 px-8 rounded-full shadow-2xl transform hover:scale-105 transition animate-pulse border-4 border-yellow-200"
                   >
                       CLAIM VICTORY!
                   </button>
               </div>
          )}
       </div>

       {/* RIGHT: Sidebar (1/4 width) */}
       <div className="w-96 flex-none flex flex-col h-full bg-gray-900 border-l border-gray-800">
           {/* Top: Scorecard (1/2 height) */}
           <div className="h-1/2 p-4 border-b border-gray-800">
               <Scorecard />
           </div>

           {/* Bottom: Chat (1/2 height) */}
           <div className="h-1/2 p-4">
               <Chat />
           </div>
       </div>

    </div>
  );
};

export default FourKindBoard;
