import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Shield, Zap, X } from 'lucide-react';
import confetti from 'canvas-confetti';

const TEAMS = ['CSK', 'MI', 'RCB', 'KKR', 'GT', 'SRH', 'LSG', 'DC', 'RR', 'PBKS', 'ANY'];

const TeamBadge = ({ team, size = 'md' }) => {
    const colors = {
        'CSK': 'bg-yellow-500', 'MI': 'bg-blue-600', 'RCB': 'bg-red-600',
        'KKR': 'bg-purple-700', 'GT': 'bg-teal-700', 'SRH': 'bg-orange-500',
        'LSG': 'bg-cyan-600', 'DC': 'bg-blue-500', 'RR': 'bg-pink-600',
        'PBKS': 'bg-red-500', 'ANY': 'bg-gray-500'
    };
    
    const s = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-md';
    
    return (
        <div className={`${s} ${colors[team] || 'bg-gray-500'} rounded-full flex items-center justify-center font-bold text-white shadow-lg border-2 border-white/20`}>
            {team}
        </div>
    );
};

const PlayerCard = ({ player, compact = false }) => (
    <div className={`relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 ${compact ? 'w-24' : 'w-32'} flex-shrink-0`}>
        <div className={`${compact ? 'h-24' : 'h-32'} bg-gray-700 relative`}>
             <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
             <div className="absolute top-1 right-1">
                 <TeamBadge team={player.team} size="sm" />
             </div>
        </div>
        <div className="p-2 text-center">
            <p className={`font-bold text-white truncate ${compact ? 'text-xs' : 'text-sm'}`}>{player.name}</p>
            <p className="text-xs text-gray-400">{player.role}</p>
        </div>
    </div>
);

const IPLDraftBoard = () => {
    const { socket, gameState } = useGame();
    const { players, iplDraft } = gameState; // We need to update context to include iplDraft data if not already
    
    // Local state for animation/modals
    const [spinning, setSpinning] = useState(false);
    const [spinResult, setSpinResult] = useState(null); // 'CSK', 'MI', etc.
    const [showPlayerSelect, setShowPlayerSelect] = useState(false);
    const [availableTeamPlayers, setAvailableTeamPlayers] = useState([]);
    
    // Derived state
    const myTurn = gameState.turn === gameState.player._id;
    const opponent = players.find(p => p._id !== gameState.player._id);
    const mySquad = gameState.iplDraft?.squads?.[gameState.player._id] || [];
    const opponentSquad = gameState.iplDraft?.squads?.[opponent?._id] || [];
    
    // Listen for events
    useEffect(() => {
        socket.on('wheelSpinning', ({ result, playerId }) => {
            setSpinning(true);
            setSpinResult(null);
            
            // Animation Duration 3s
            setTimeout(() => {
                setSpinning(false);
                setSpinResult(result);
                
                if (playerId === gameState.player._id) {
                     // Fetch players for this team
                     socket.emit('getPlayersForTeam', { roomCode: gameState.roomCode, team: result });
                }
            }, 3000);
        });

        socket.on('teamPlayersList', ({ team, players }) => {
            setAvailableTeamPlayers(players);
            setShowPlayerSelect(true);
        });

        socket.on('updateIPLDraft', (data) => {
             // GameContext should handle this generically or we do it manual here if needed
             setShowPlayerSelect(false);
             setSpinResult(null);
             toast.success(`Pick made: ${data.lastPick.name}`);
        });

        return () => {
            socket.off('wheelSpinning');
            socket.off('teamPlayersList');
            socket.off('updateIPLDraft');
        };
    }, [socket, gameState.roomCode, gameState.player._id]);

    const handleSpin = () => {
        if (!myTurn) return toast.error("Not your turn!");
        if (spinning) return;
        socket.emit('spinWheel', { roomCode: gameState.roomCode });
    };

    const handlePick = (playerObj) => {
        socket.emit('pickPlayer', { 
            roomCode: gameState.roomCode, 
            playerId: gameState.player._id, 
            playerObj 
        });
    };

    return (
        <div className="h-screen bg-[#0f1020] text-white flex overflow-hidden relative font-sans">
            
            {/* BACKGROUND */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 pointer-events-none"></div>

            {/* LEFT/CENTER: Spinner Area */}
            <div className="flex-grow flex flex-col items-center justify-center relative p-8">
                
                {/* Header Info */}
                <div className="absolute top-8 text-center">
                    <h1 className="text-4xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                        IPL DRAFT 2024
                    </h1>
                    <div className="flex items-center gap-4 bg-gray-800/50 p-2 rounded-full px-6 border border-gray-700">
                        <div className={`flex items-center gap-2 ${myTurn ? 'text-green-400' : 'text-gray-400'}`}>
                            <div className={`w-3 h-3 rounded-full ${myTurn ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
                            {myTurn ? "YOUR TURN" : `${opponent?.username}'s TURN`}
                        </div>
                    </div>
                </div>

                {/* SPINNER WHEEL */}
                <div className="relative">
                     {/* Wheel Circle */}
                     <motion.div 
                        className="w-96 h-96 rounded-full border-8 border-gray-800 bg-gray-900 relative shadow-2xl overflow-hidden"
                        animate={{ rotate: spinning ? 3600 : 0 }}
                        transition={{ duration: 3, ease: "easeOut" }}
                     >
                         {/* Render Segments (Simplified Visuals) */}
                         {TEAMS.map((team, i) => (
                             <div 
                                key={team}
                                className="absolute w-full h-full text-center"
                                style={{ transform: `rotate(${i * (360/TEAMS.length)}deg)` }}
                             >
                                 <div className="mt-4 text-xs font-bold text-gray-500">{team}</div>
                             </div>
                         ))}
                         
                         {/* Center Knob */}
                         <div className="absolute inset-0 m-auto w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full border-4 border-gray-600 shadow-xl flex items-center justify-center z-10">
                             <Trophy className="text-yellow-500" />
                         </div>
                     </motion.div>

                     {/* Indicator */}
                     <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-red-500 z-20">
                         ▼
                     </div>

                     {/* Spin Button */}
                     {!spinning && !showPlayerSelect && (
                         <button 
                            onClick={handleSpin}
                            disabled={!myTurn}
                            className={`
                                absolute bottom-[-4rem] left-1/2 transform -translate-x-1/2 
                                px-8 py-3 rounded-full font-black text-xl shadow-lg border-2
                                transition-all hover:scale-105 active:scale-95
                                ${myTurn 
                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-black border-yellow-300 animate-bounce' 
                                    : 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed'}
                            `}
                         >
                            {myTurn ? "SPIN NOW!" : "WAITING..."}
                         </button>
                     )}

                     {/* Result Display */}
                     {!spinning && spinResult && !showPlayerSelect && (
                         <div className="absolute inset-0 flex items-center justify-center z-30">
                             <motion.div 
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="bg-black/90 p-6 rounded-2xl border-2 border-yellow-400 text-center"
                             >
                                 <p className="text-gray-400 text-sm mb-2">LANDED ON</p>
                                 <TeamBadge team={spinResult} size="lg" />
                                 <p className="text-2xl font-bold mt-2">{spinResult}</p>
                             </motion.div>
                         </div>
                     )}
                </div>

                {/* MY SQUAD (Bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900/90 border-t border-gray-800 backdrop-blur-md">
                    <div className="max-w-6xl mx-auto flex items-center gap-6">
                        <div className="flex-none">
                            <h3 className="text-xl font-bold text-white">YOUR SQUAD</h3>
                            <p className="text-yellow-400 font-mono text-sm">{mySquad.length}/15 PLAYERS</p>
                        </div>
                        <div className="flex-grow overflow-x-auto flex gap-4 pb-2 scrollbar-hide">
                            {mySquad.map((p, i) => (
                                <PlayerCard key={i} player={p} compact />
                            ))}
                            {[...Array(15 - mySquad.length)].map((_, i) => (
                                <div key={i} className="w-24 h-32 bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center flex-shrink-0">
                                    <span className="text-gray-600 font-bold opacity-50">{i + 1 + mySquad.length}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* RIGHT: Opponent Squad */}
            <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-800 bg-gray-800/50">
                    <h3 className="text-lg font-bold text-gray-200">OPPONENT</h3>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                            <Users size={16} />
                        </div>
                        <div>
                            <p className="text-sm font-bold">{opponent?.username || 'Waiting...'}</p>
                            <p className="text-xs text-gray-500">{opponentSquad.length}/15 Players</p>
                        </div>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-3">
                    {opponentSquad.map((p, i) => (
                         <div key={i} className="flex items-center gap-3 bg-gray-800 p-2 rounded border border-gray-700 opacity-70">
                             <img src={p.image} className="w-10 h-10 rounded object-cover" />
                             <div>
                                 <p className="text-sm font-bold text-gray-300">{p.name}</p>
                                 <div className="flex items-center gap-1">
                                     <span className="text-[10px] bg-gray-700 px-1 rounded">{p.role}</span>
                                     <span className="text-[10px] bg-blue-900 px-1 rounded">{p.team}</span>
                                 </div>
                             </div>
                         </div>
                    ))}
                    {opponentSquad.length === 0 && (
                        <p className="text-center text-gray-600 mt-10">No players drafted yet.</p>
                    )}
                </div>
            </div>

            {/* MODAL: Player Selection */}
            <AnimatePresence>
                {showPlayerSelect && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
                    >
                         <div className="bg-gray-900 w-full max-w-4xl h-[80vh] rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden">
                             <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                                 <div>
                                     <h2 className="text-3xl font-bold flex items-center gap-3">
                                         Select from <TeamBadge team={spinResult} />
                                     </h2>
                                     <p className="text-gray-400 mt-1">Pick 1 player for your squad</p>
                                 </div>
                                 <button onClick={() => setShowPlayerSelect(false)} className="text-gray-500 hover:text-white">
                                     <X size={32} />
                                 </button>
                             </div>
                             
                             <div className="flex-grow overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                 {availableTeamPlayers.map(p => (
                                     <button 
                                        key={p.id}
                                        onClick={() => handlePick(p)}
                                        className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500 transition-all rounded-xl overflow-hidden group text-left relative"
                                     >
                                         <div className="h-40 bg-gray-700 relative overflow-hidden">
                                             <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                             <div className="absolute top-2 right-2">
                                                 <span className="bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md border border-white/10">{p.role}</span>
                                             </div>
                                         </div>
                                         <div className="p-4">
                                             <h3 className="font-bold text-lg leading-tight group-hover:text-yellow-400">{p.name}</h3>
                                             <p className="text-sm text-gray-500 mt-1">{p.team}</p>
                                         </div>
                                     </button>
                                 ))}
                             </div>
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default IPLDraftBoard;
