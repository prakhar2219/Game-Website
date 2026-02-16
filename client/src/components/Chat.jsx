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
    <div className="flex flex-col h-full bg-gray-900/80 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
        <MessageCircle size={18} className="text-teal-400" />
        <h3 className="font-bold text-gray-200">Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className="flex flex-col">
            <span className={`text-xs font-bold ${msg.username === gameState.player?.username ? 'text-teal-400 self-end' : 'text-orange-400'}`}>
              {msg.username}
            </span>
            <div className={`
              max-w-[85%] px-3 py-2 rounded-lg text-sm break-words
              ${msg.username === gameState.player?.username 
                ? 'bg-teal-600/20 text-teal-100 self-end rounded-tr-none' 
                : 'bg-gray-700/50 text-gray-200 self-start rounded-tl-none'}
            `}>
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 bg-gray-800 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
        />
        <button
          type="submit"
          className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-lg transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default Chat;
