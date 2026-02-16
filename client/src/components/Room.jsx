import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { toast } from 'react-hot-toast';
import { PlusCircle, LogIn, Users, BookOpen, Crown, Layers, ArrowLeft, Trophy } from 'lucide-react';

const Room = () => {
  const { socket, gameState, setGameState } = useGame(); // Added setGameState to manually update gameType if needed locally
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [view, setView] = useState('select-game'); // select-game, menu, create, join
  const [selectedGame, setSelectedGame] = useState(null); // 'raja_mantri', 'four_kind'

  const GAMES = [
      {
          id: 'raja_mantri',
          title: 'Raja Mantri',
          desc: 'The classic role-guessing game',
          icon: Crown,
          gradient: 'from-yellow-400 to-orange-500'
      },
      {
          id: 'four_kind',
          title: 'Four of a Kind',
          desc: 'Fast-paced card passing madness',
          icon: Layers, // or Grid2X2
          gradient: 'from-teal-400 to-emerald-500'
      },
      {
          id: 'ipl_draft',
          title: 'IPL Spinner Draft',
          desc: 'Build your dream 15-man squad',
          icon: Trophy,
          gradient: 'from-blue-600 to-indigo-700'
      }
  ];

  const handleGameSelect = (gameId) => {
      setSelectedGame(gameId);
      setView('menu');
  };

  const createRoom = () => {
    if (!username) return toast.error('Enter username');
    socket.emit('createRoom', { username, gameType: selectedGame });
  };

  const joinRoom = () => {
    if (!username || !roomCode) return toast.error('Enter details');
    socket.emit('joinRoom', { username, roomCode });
  };

  // Check if rejoining (local storage exists but no room code in state yet)
  const isRejoining = !gameState.roomCode && localStorage.getItem('rmcs_roomCode');

  if (isRejoining) {
     return (
       <div className="flex flex-col items-center justify-center h-screen bg-[#0a0b1e] text-white">
          <h1 className="text-2xl animate-pulse">Rejoining Game...</h1>
       </div>
     );
  }

  // Lobby/Waiting View (already joined)
  if (gameState.roomCode) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0b1e] text-white">
        <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">Room: {gameState.roomCode}</h1>
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96 space-y-4 border border-gray-700">
          <h2 className="text-2xl font-semibold">Players ({gameState.players.length}/4)</h2>
          
          {/* Show Game Type */}
          <div className="bg-gray-900/50 p-2 rounded text-center text-sm text-gray-400 mb-2">
              Playing: <span className="text-white font-bold">{gameState.gameType === 'four_kind' ? 'Four of a Kind' : 'Raja Mantri'}</span>
          </div>

          <ul className="space-y-2">
            {gameState.players.map((p, i) => (
              <li key={i} className="bg-gray-700/50 p-3 rounded flex justify-between items-center border border-gray-600">
                <span>{p.username}</span>
                {p.isHost && <span className="text-yellow-400 text-xs font-bold px-2 py-1 bg-yellow-400/10 rounded">HOST</span>}
              </li>
            ))}
          </ul>
          {gameState.isHost && gameState.players.length === 4 && (
            <button 
              onClick={() => {
                  if (gameState.gameType === 'four_kind') {
                      socket.emit('startFourKindGame', { roomCode: gameState.roomCode });
                  } else {
                      socket.emit('startGame', { roomCode: gameState.roomCode });
                  }
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 py-3 rounded font-bold transition text-xl animate-pulse shadow-lg"
            >
              Start Game
            </button>
          )}
          {gameState.isHost && gameState.players.length < 4 && (
             <p className="text-center text-gray-400 animate-pulse">Waiting for players...</p>
          )}
           {!gameState.isHost && (
             <p className="text-center text-gray-400 animate-pulse">Waiting for host to start...</p>
          )}
          <button 
            onClick={() => {
               socket.emit('leaveRoom', { roomCode: gameState.roomCode, playerId: gameState.player._id });
               localStorage.removeItem('rmcs_roomCode');
               localStorage.removeItem('rmcs_playerId');
               window.location.reload();
            }}
            className="w-full bg-red-600/80 hover:bg-red-700/90 py-2 rounded font-bold transition mt-4 border border-red-500/50"
          >
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  // Navigation Helper
  const BackButton = ({ to = 'menu' }) => (
    <button 
      onClick={() => setView(to)}
      className="absolute top-4 left-4 text-gray-400 hover:text-white transition flex items-center gap-2"
    >
      <ArrowLeft size={18} /> Back
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-white flex flex-col relative overflow-hidden font-sans">
      {/* Background Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-1/4 w-1 h-1 bg-white rounded-full opacity-50"></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-blue-400 rounded-full opacity-30 blur-sm"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-40"></div>
      </div>
      
      {/* Header */}
      <div className="flex-none pt-12 pb-8 flex flex-col items-center z-10 text-center">
         <h1 className="text-5xl md:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-600 drop-shadow-lg leading-tight" style={{ fontFamily: 'sans-serif' }}>
            MULTIPLAYER<br/>PLATFORM
         </h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex items-center justify-center p-4 z-10 w-full max-w-4xl mx-auto">
        
        {/* VIEW: SELECT GAME */}
        {view === 'select-game' && (
            <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
                {GAMES.map((game) => (
                    <button
                        key={game.id}
                        onClick={() => handleGameSelect(game.id)}
                        className="group relative overflow-hidden rounded-3xl p-1 transition-all hover:scale-[1.02] active:scale-[0.98] h-64 shadow-2xl"
                    >
                         <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
                         <div className="absolute inset-0 border-2 border-white/10 rounded-3xl group-hover:border-white/30 transition-colors"></div>
                         
                         <div className="relative h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                             <div className={`p-4 rounded-full bg-gradient-to-br ${game.gradient} shadow-lg group-hover:shadow-2xl transition-all`}>
                                 <game.icon size={48} className="text-white drop-shadow-md" />
                             </div>
                             <div>
                                 <h3 className="text-2xl font-bold text-white mb-2">{game.title}</h3>
                                 <p className="text-gray-400 text-sm group-hover:text-gray-200 transition-colors">{game.desc}</p>
                             </div>
                         </div>
                    </button>
                ))}
            </div>
        )}

        {/* VIEW: MENU (Create/Join/Browse) for Selected Game */}
        {view === 'menu' && (
          <div className="flex flex-col space-y-4 w-full max-w-md relative">
            <BackButton to="select-game" />
            
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-white">
                    {GAMES.find(g => g.id === selectedGame)?.title}
                </h2>
            </div>
            
            {/* Create Room Card */}
            <button 
              onClick={() => setView('create')}
              className="group relative overflow-hidden rounded-2xl p-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-90 transition-opacity group-hover:opacity-100"></div>
              <div className="relative flex items-center justify-between p-6 h-24">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <PlusCircle size={32} className="text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold leading-tight">Create New Room</h3>
                  </div>
                </div>
                <div className="bg-white/10 p-2 rounded-full">
                  <span className="text-xl">›</span>
                </div>
              </div>
            </button>

            {/* Join Room Card */}
            <button 
              onClick={() => setView('join')}
              className="group relative overflow-hidden rounded-2xl p-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-600 opacity-90 transition-opacity group-hover:opacity-100"></div>
              <div className="relative flex items-center justify-between p-6 h-24">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <LogIn size={32} className="text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold leading-tight">Join with Code</h3>
                  </div>
                </div>
                <div className="bg-white/10 p-2 rounded-full">
                  <span className="text-xl">›</span>
                </div>
              </div>
            </button>

            {/* Browse Lobbies Card */}
            <button 
              onClick={() => toast('Coming Soon!', { icon: '🚀' })}
              className="group relative overflow-hidden rounded-2xl p-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-600 opacity-90 transition-opacity group-hover:opacity-100"></div>
              <div className="relative flex items-center justify-between p-6 h-24">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <Users size={32} className="text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold leading-tight">Browse Lobbies</h3>
                  </div>
                </div>
                <div className="bg-white/10 p-2 rounded-full">
                  <span className="text-xl">›</span>
                </div>
              </div>
            </button>

          </div>
        )}

        {view === 'create' && (
          <div className="w-full max-w-md bg-gray-800/80 backdrop-blur-md p-8 rounded-2xl border border-gray-700 shadow-2xl relative">
            <BackButton to="menu" />
            <div className="mt-6 space-y-6">
              <div className="text-center">
                 <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Create Room</h2>
                 <p className="text-gray-400 mt-1">
                     Game: <span className="text-white font-semibold">{GAMES.find(g => g.id === selectedGame)?.title}</span>
                 </p>
              </div>
              <input
                type="text"
                placeholder="Enter Username"
                className="w-full p-4 rounded-xl bg-gray-900/50 border border-gray-600 focus:outline-none focus:border-purple-500 text-lg transition-colors"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && createRoom()}
              />
              <button 
                onClick={createRoom}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 py-4 rounded-xl font-bold transition text-lg shadow-lg hover:shadow-purple-500/25"
              >
                Create Now
              </button>
            </div>
          </div>
        )}

        {view === 'join' && (
          <div className="w-full max-w-md bg-gray-800/80 backdrop-blur-md p-8 rounded-2xl border border-gray-700 shadow-2xl relative">
            <BackButton to="menu" />
             <div className="mt-6 space-y-6">
              <div className="text-center">
                 <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Join Room</h2>
                 <p className="text-gray-400">Enter details to join</p>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter Username"
                  className="w-full p-4 rounded-xl bg-gray-900/50 border border-gray-600 focus:outline-none focus:border-orange-500 text-lg transition-colors"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Room Code"
                  className="w-full p-4 rounded-xl bg-gray-900/50 border border-gray-600 focus:outline-none focus:border-orange-500 text-lg transition-colors uppercase tracking-widest text-center font-mono"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                />
              </div>
              <button 
                onClick={joinRoom}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 py-4 rounded-xl font-bold transition text-lg shadow-lg hover:shadow-orange-500/25"
              >
                Join Game
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="flex-none py-6 text-center text-gray-500 text-sm flex flex-col items-center space-y-4">
         <div className="text-lg font-medium text-gray-400">
             ~❤️ praKHar
         </div>
      </div>
      
      {/* Guide Link */}
      <div className="absolute top-6 right-6 flex items-center space-x-2 text-gray-400 hover:text-white cursor-pointer transition">
          <BookOpen size={18} />
          <span className="font-medium">Guide</span>
      </div>
    </div>
  );
};

export default Room;

