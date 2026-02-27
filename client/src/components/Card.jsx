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
        <div className="absolute w-full h-full bg-gradient-to-b from-[#3a1c2e] to-[#160d1b] rounded-xl backface-hidden flex items-center justify-center border border-[#523d6a]/80 shadow-2xl overflow-hidden hover:border-[#e2c792]/50 transition-colors p-2">
          <img 
             src="/images/logo.png" 
             alt="Logo" 
             className="w-full h-full object-contain opacity-90 drop-shadow-[0_0_15px_rgba(226,199,146,0.3)]"
             onError={(e) => { e.target.style.display = 'none'; }} 
          />
        </div>

        {/* Back (Revealed) */}
        <div 
          className="absolute w-full h-full bg-[#1a1225] rounded-xl backface-hidden flex flex-col items-center justify-center border border-[#e2c792] shadow-2xl overflow-hidden"
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
             <span className="text-lg text-yellow-300 font-black drop-shadow-md">{role?.points} pts</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Card;
