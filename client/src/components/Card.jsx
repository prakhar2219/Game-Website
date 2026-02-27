import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ role, isRevealed, onClick }) => {
  return (
    <div className="w-32 h-48 perspective-1000 cursor-pointer" onClick={onClick}>
      <motion.div
        className="relative w-full h-full text-center transition-transform duration-500 transform-style-3d"
        animate={{ rotateY: isRevealed ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front (Hidden) */}
        <div className="absolute w-full h-full bg-gray-900 rounded-lg backface-hidden flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
          <img 
             src="/images/logo.png" 
             alt="Logo" 
             className="w-full h-full object-cover"
             onError={(e) => { e.target.style.display = 'none'; }} 
          />
        </div>

        {/* Back (Revealed) */}
        <div 
          className="absolute w-full h-full bg-white rounded-lg backface-hidden flex flex-col items-center justify-center border-4 border-yellow-400 shadow-lg overflow-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          {role?.name && (
             <img 
                src={`/images/${role.name === 'Chor' ? 'chhor' : role.name.toLowerCase()}.png`} 
                alt={role.name}
                className="w-full h-full object-cover absolute inset-0 opacity-90"
                onError={(e) => { e.target.style.display = 'none'; }} // Fallback if image missing
             />
          )}
          <div className="relative z-10 bg-black/50 w-full text-center py-2 mt-auto">
             <span className="text-xl font-bold text-white block drop-shadow-md">{role?.name}</span>
             <span className="text-lg text-yellow-300 font-black drop-shadow-md">{role?.points} pts</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Card;
