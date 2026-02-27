import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Send, MessageCircle } from 'lucide-react';

const Chat = () => {
  const { socket, gameState } = useGame();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const myUsername = gameState.players.find(p => p._id === gameState.player?._id)?.username || 'Unknown';

    socket.emit('sendMessage', {
      roomCode: gameState.roomCode,
      message: input,
      username: myUsername,
    });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1a1225] border border-[#3a2a4b] rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#e2c792]/20 to-transparent"></div>
      
      {/* Header */}
      <div className="p-4 border-b border-[#3a2a4b]/60 flex justify-between items-center z-10">
        <h3 className="text-sm font-cinzel text-[#e2c792] tracking-widest flex items-center gap-2 uppercase">
           <MessageCircle size={16} className="text-[#e2c792]" /> TABLE CHAT
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className="flex flex-col">
            <span className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${msg.username === gameState.player?.username ? 'text-[#e2c792] self-end' : 'text-gray-400'}`}>
              {msg.username}
            </span>
            <div className={`
              max-w-[85%] px-4 py-2.5 rounded-2xl text-sm break-words shadow-sm
              ${msg.username === gameState.player?.username 
                ? 'bg-[#3a2a4b] text-[#e2c792] self-end rounded-tr-sm border border-[#523d6a]/50' 
                : 'bg-[#140d1c] text-gray-200 self-start rounded-tl-sm border border-[#3a2a4b]'}
            `}>
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 bg-[#1a1225] border-t border-[#3a2a4b]/60 flex gap-2 items-center z-10">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow bg-[#09050e] border border-[#3a2a4b] rounded-full px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-[#e2c792]/50 transition-colors placeholder-gray-600"
        />
        <button
          type="submit"
          className="bg-[#e2c792] hover:bg-[#d0b378] text-[#09050e] p-2.5 rounded-full transition-transform hover:scale-105 active:scale-95 shadow-md flex items-center justify-center flex-shrink-0"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default Chat;
