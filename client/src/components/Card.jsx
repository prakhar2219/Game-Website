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
        <div className="absolute w-full h-full bg-blue-600 rounded-lg backface-hidden flex items-center justify-center border-4 border-white shadow-lg">
          <span className="text-4xl">?</span>
        </div>

        {/* Back (Revealed) */}
        <div 
          className="absolute w-full h-full bg-white rounded-lg backface-hidden flex flex-col items-center justify-center border-4 border-yellow-400 shadow-lg"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <span className="text-xl font-bold">{role?.name}</span>
          <span className="text-lg text-gray-600">{role?.points}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Card;
