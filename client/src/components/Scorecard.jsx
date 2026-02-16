import React from 'react';
import { useGame } from '../context/GameContext';
import { Crown, Trophy, History } from 'lucide-react';

const Scorecard = () => {
  const { gameState } = useGame();
  const { gameHistory = [], players = [] } = gameState;

  // Calculate scores from history
  const scores = {};
  players.forEach(p => scores[p.username] = 0);
  
  gameHistory.forEach(round => {
      if (round.winner) {
          scores[round.winner] = (scores[round.winner] || 0) + 1;
      }
  });

  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => (scores[b.username] || 0) - (scores[a.username] || 0));

  return (
    <div className="flex flex-col h-full bg-gray-900/80 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
        <Trophy size={18} className="text-yellow-400" />
        <h3 className="font-bold text-gray-200">Scorecard</h3>
      </div>

      {/* Leaderboard */}
      <div className="p-4 space-y-3">
          {sortedPlayers.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-2">
                      {idx === 0 && <Crown size={16} className="text-yellow-400" />}
                      <span className="font-bold text-gray-300">{p.username}</span>
                  </div>
                  <span className="font-mono text-xl text-teal-400 font-bold">{scores[p.username] || 0}</span>
              </div>
          ))}
      </div>

      {/* History Limit */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-500 flex items-center gap-1 justify-center">
          <History size={12} />
          Last {gameHistory.length} Rounds
      </div>
    </div>
  );
};

export default Scorecard;
