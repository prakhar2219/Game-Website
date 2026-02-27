import React from 'react';
import { useGame } from '../context/GameContext';
import { Trophy } from 'lucide-react';

const Scoreboard = () => {
  const { gameState } = useGame();

  // Sort players by score descending
  const sortedPlayers = [...(gameState.players || [])].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className="flex flex-col h-full bg-[#1a1225] border border-[#3a2a4b] rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-[#3a2a4b]/60 flex items-center gap-2 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e2c792]/20 to-transparent"></div>
        <Trophy size={16} className="text-[#e2c792]" />
        <h3 className="text-sm font-cinzel text-[#e2c792] tracking-widest uppercase">SCOREBOARD</h3>
      </div>

      {/* Scores Table */}
      <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#3a2a4b]/50 text-gray-400 text-xs tracking-wider uppercase">
              <th className="pb-2">Player</th>
              <th className="pb-2 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p, idx) => (
              <tr key={p._id} className="border-b border-[#3a2a4b]/30">
                <td className="py-2">
                  <div className="flex items-center gap-2">
                     <span className={`font-bold ${idx === 0 ? 'text-yellow-400' : 'text-gray-300'}`}>
                       #{idx + 1}
                     </span>
                     <span className={`text-sm ${p._id === gameState.player?._id ? 'text-[#e2c792] font-bold tracking-wide' : 'text-gray-200'}`}>
                       {p.username}
                     </span>
                  </div>
                </td>
                <td className={`py-3 text-right font-black ${idx === 0 ? 'text-[#e2c792]' : 'text-white'}`}>
                  {p.totalPoints}
                </td>
              </tr>
            ))}
            {sortedPlayers.length === 0 && (
                <tr>
                    <td colSpan="2" className="text-center py-4 text-gray-500 italic text-sm">
                        Waiting for players...
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Scoreboard;
