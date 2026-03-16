import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Shield, Zap, X } from 'lucide-react';
import confetti from 'canvas-confetti';

const TEAMS = ['MI', 'KKR', 'RCB', 'LSG', 'CSK', 'GT', 'RR', 'SRH', 'ANY', 'DC', 'PBKS'];

// Color palette cycling around the wheel (11 sectors)
const SLICE_COLORS = [
    '#facc15', // yellow
    '#2563eb', // blue
    '#ef4444', // red
    '#22c55e', // green
    '#f97316', // orange
    '#0ea5e9', // cyan
    '#a855f7', // purple
    '#ec4899', // pink
    '#6b7280', // gray (Any Team)
    '#facc15', // repeat
    '#2563eb'  // repeat
];

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
             <img 
                src={player.image} 
                alt={player.name} 
                onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff`;
                }}
                className="w-full h-full object-cover" 
             />
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
    const [selectionMode, setSelectionMode] = useState(null); // 'team' | 'player' | null
    const [availableTeamPlayers, setAvailableTeamPlayers] = useState([]);
    
    // Derived state (normalize IDs for reliable turn comparison)
    const myTurn = String(gameState.turn || '') === String(gameState.player?._id || '');
    const opponent = players.find(p => p._id !== gameState.player._id);
    const mySquad = gameState.iplDraft?.squads?.[gameState.player._id] || [];
    const opponentSquad = gameState.iplDraft?.squads?.[opponent?._id] || [];
    const myTeamCounts = gameState.iplDraft?.teamCounts?.[gameState.player._id] || {};

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
                     // If "ANY" is rolled, let the user choose a specific team first
                     if (result === 'ANY') {
                         setSelectionMode('team');
                         setShowPlayerSelect(true);
                     } else {
                         // Fetch players for this concrete team
                         socket.emit('getPlayersForTeam', { roomCode: gameState.roomCode, team: result });
                     }
                }
            }, 3000);
        });

        socket.on('teamPlayersList', ({ team, players }) => {
            setAvailableTeamPlayers(players);
            setSelectionMode('player');
            setShowPlayerSelect(true);
        });

        socket.on('updateIPLDraft', (data) => {
             // GameContext updates global state; here we just clean local UI
             setShowPlayerSelect(false);
             setSelectionMode(null);
             setSpinResult(null);
             setAvailableTeamPlayers([]);
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

    const handleAnyTeamChoice = (team) => {
        const takenFromTeam = myTeamCounts?.[team] || 0;
        if (takenFromTeam >= 2) {
            toast.error('You already have 2 players from this team.');
            return;
        }

        setSpinResult(team);
        setSelectionMode('player');
        socket.emit('getPlayersForTeam', { roomCode: gameState.roomCode, team });
    };

    return (
        <div className="h-screen bg-[#0f1020] text-white flex overflow-hidden relative font-sans">
            
            {/* BACKGROUND */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 pointer-events-none"></div>

            {/* LEAVE BUTTON */}
            <button 
                onClick={() => {
                    if (confirm('Are you sure you want to leave?')) {
                        socket.emit('leaveRoom', { roomCode: gameState.roomCode, playerId: gameState.player._id });
                        localStorage.removeItem('rmcs_roomCode');
                        localStorage.removeItem('rmcs_playerId');
                        window.location.reload();
                    }
                }}
                className="absolute top-4 right-4 z-50 bg-red-600/80 hover:bg-red-700 p-2 rounded-lg text-white font-bold text-sm flex items-center gap-2 border border-red-500 transition-all hover:scale-105 shadow-lg"
            >
                <X size={16} /> LEAVE
            </button>

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
                     {/* Outer glow ring */}
                     <div className="absolute inset-[-12px] rounded-full bg-white/5 blur-2xl pointer-events-none" />

                     {/* Wheel Circle with 11 colored sectors (like reference) */}
                     <motion.div 
                        className="w-96 h-96 rounded-full border-[10px] border-white/70 bg-gray-900 relative shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden"
                        style={{
                            backgroundImage: `conic-gradient(${SLICE_COLORS.map((c, i) => {
                                const start = (360 / SLICE_COLORS.length) * i;
                                const end = (360 / SLICE_COLORS.length) * (i + 1);
                                return `${c} ${start}deg ${end}deg`;
                            }).join(',')})`
                        }}
                        animate={{ rotate: spinning ? 3600 : 0 }}
                        transition={{ duration: 3, ease: "easeOut" }}
                     >
                         {/* Team labels near the circumference of each sector */}
                         {TEAMS.map((team, i) => {
                             const sliceAngle = 360 / TEAMS.length;
                             const midAngle = sliceAngle * i + sliceAngle / 2;
                             return (
                                 <div
                                     key={team}
                                     className="absolute inset-0 flex items-center justify-center"
                                     style={{ transform: `rotate(${midAngle}deg)` }}
                                 >
                                     <span
                                         className="text-sm font-bold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                                         style={{ 
                                             // slightly inward from the rim so text isn't at the very top edge
                                             transform: 'translateY(-145px) rotate(-90deg)',
                                             whiteSpace: 'nowrap'
                                         }}
                                     >
                                         {team === 'ANY' ? 'Any Team' : team}
                                     </span>
                                 </div>
                             );
                         })}
                         
                         {/* Center Knob / Spin Button */}
                         <button
                            onClick={handleSpin}
                            disabled={!myTurn || spinning}
                            className={`
                                absolute inset-0 m-auto w-32 h-32 rounded-full border-[6px] shadow-xl z-10
                                flex flex-col items-center justify-center
                                transition-all duration-300
                                ${myTurn && !spinning
                                    ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 border-yellow-200 scale-110 animate-pulse cursor-pointer hover:scale-125' 
                                    : 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-500 cursor-not-allowed grayscale'}
                            `}
                         >
                             <Trophy className={`w-10 h-10 ${myTurn && !spinning ? 'text-white' : 'text-slate-300'}`} />
                             <span className={`text-xs font-black mt-1 tracking-[0.2em] uppercase ${myTurn && !spinning ? 'text-white' : 'text-slate-300'}`}>
                                 {spinning ? '...' : myTurn ? 'Spin' : 'Wait'}
                             </span>
                         </button>
                     </motion.div>

                     {/* Indicator / Arrow */}
                     <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                         <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-b-[22px] border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]" />
                         <div className="w-3 h-3 bg-yellow-300 rounded-full mx-auto -mt-1 shadow-[0_0_8px_rgba(250,204,21,0.9)]" />
                     </div>

                     {/* Result Display */}
                     {!spinning && spinResult && !showPlayerSelect && (
                         <div className="absolute inset-0 flex items-center justify-center z-30">
                             <motion.div 
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="bg-black/90 px-8 py-5 rounded-2xl border-2 border-yellow-400 text-center shadow-[0_0_25px_rgba(250,204,21,0.5)]"
                             >
                                 <p className="text-gray-300 text-xs tracking-[0.25em] uppercase mb-2">Landed On</p>
                                 <TeamBadge team={spinResult} size="lg" />
                                 <p className="text-2xl font-extrabold mt-3 tracking-wide">
                                     {spinResult === 'ANY' ? 'Any Team' : spinResult}
                                 </p>
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
                             <img 
                                src={p.image} 
                                onError={(e) => {
                                    e.target.onerror = null; 
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&color=fff`;
                                }}
                                className="w-10 h-10 rounded object-cover" 
                             />
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
                                     {selectionMode === 'team' ? (
                                         <>
                                             <h2 className="text-3xl font-bold">Choose Team</h2>
                                             <p className="text-gray-400 mt-1">Select an IPL team to pick from</p>
                                         </>
                                     ) : (
                                         <>
                                             <h2 className="text-3xl font-bold flex items-center gap-3">
                                                 Select from <TeamBadge team={spinResult} />
                                             </h2>
                                             <p className="text-gray-400 mt-1">Pick 1 player for your squad</p>
                                         </>
                                     )}
                                 </div>
                                 <button 
                                    onClick={() => {
                                        setShowPlayerSelect(false);
                                        setSelectionMode(null);
                                        setAvailableTeamPlayers([]);
                                    }} 
                                    className="text-gray-500 hover:text-white"
                                 >
                                     <X size={32} />
                                 </button>
                             </div>
                             
                             <div className="flex-grow overflow-y-auto p-6">
                                 {selectionMode === 'team' ? (
                                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                         {TEAMS.filter(t => t !== 'ANY').map(team => {
                                             const taken = myTeamCounts?.[team] || 0;
                                             const disabled = taken >= 2;
                                             return (
                                                 <button
                                                    key={team}
                                                    disabled={disabled}
                                                    onClick={() => handleAnyTeamChoice(team)}
                                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                                                        disabled
                                                            ? 'border-gray-700 bg-gray-800/60 text-gray-600 cursor-not-allowed'
                                                            : 'border-gray-700 bg-gray-800 hover:border-yellow-500 hover:bg-gray-700 cursor-pointer'
                                                    }`}
                                                 >
                                                     <TeamBadge team={team} size="lg" />
                                                     <span className="mt-2 font-bold">{team}</span>
                                                     <span className="mt-1 text-xs text-gray-400">
                                                         {taken}/2 picked
                                                     </span>
                                                 </button>
                                             );
                                         })}
                                     </div>
                                 ) : (
                                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                         {availableTeamPlayers.map(p => (
                                             <button 
                                                key={p.id}
                                                onClick={() => handlePick(p)}
                                                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-yellow-500 transition-all rounded-xl overflow-hidden group text-left relative flex flex-col"
                                             >
                                                 <div className="h-40 bg-gray-700 relative overflow-hidden flex-shrink-0">
                                                     <img 
                                                         src={p.image} 
                                                         alt={p.name}
                                                         onError={(e) => {
                                                             e.target.onerror = null; 
                                                             e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&color=fff&size=256`;
                                                         }}
                                                         className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                                                     />
                                                     <div className="absolute top-2 right-2">
                                                         <span className="bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md border border-white/10">{p.role}</span>
                                                     </div>
                                                 </div>
                                                 <div className="p-4 flex-grow flex flex-col justify-center">
                                                     <h3 className="font-bold text-lg leading-tight text-white group-hover:text-yellow-400">{p.name}</h3>
                                                     <p className="text-sm text-gray-400 mt-1">{p.team}</p>
                                                 </div>
                                             </button>
                                         ))}
                                     </div>
                                 )}
                             </div>
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default IPLDraftBoard;
