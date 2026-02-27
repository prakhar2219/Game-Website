import React from 'react';
import { useGame } from '../context/GameContext';
import { Trophy } from 'lucide-react';

const Scoreboard = () => {
  const { gameState } = useGame();

  // Sort players by score descending
  const sortedPlayers = [...(gameState.players || [])].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className="flex flex-col h-full bg-gray-900/80 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
        <Trophy size={18} className="text-yellow-400" />
        <h3 className="font-bold text-gray-200">Scoreboard</h3>
      </div>

      {/* Scores Table */}
      <div className="flex-grow overflow-y-auto p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-sm">
              <th className="pb-2">Player</th>
              <th className="pb-2 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p, idx) => (
              <tr key={p._id} className="border-b border-gray-800/50">
                <td className="py-2">
                  <div className="flex items-center gap-2">
                     <span className={`font-bold ${idx === 0 ? 'text-yellow-400' : 'text-gray-300'}`}>
                       #{idx + 1}
                     </span>
                     <span className={`text-sm ${p._id === gameState.player?._id ? 'text-teal-400 font-bold' : 'text-gray-200'}`}>
                       {p.username}
                     </span>
                  </div>
                </td>
                <td className={`py-2 text-right font-black ${idx === 0 ? 'text-yellow-400' : 'text-white'}`}>
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
