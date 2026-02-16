module.exports = (io, socket) => {
  // Join Video Room
  socket.on('join-video', ({ roomCode, userId }) => {
    socket.join(roomCode + '-video');
    socket.join(userId); // Join a room with the user's DB ID so we can message them directly
    
    // Store data for disconnect handling
    socket.videoRoom = roomCode + '-video';
    socket.userId = userId;

    // Notify others in the video room that a new user connected
    socket.to(roomCode + '-video').emit('user-connected', userId);
  });

  // WebRTC Signaling
  socket.on('offer', ({ offer, to, from }) => {
    io.to(to).emit('receive-offer', { offer, from });
  });

  socket.on('answer', ({ answer, to, from }) => {
    io.to(to).emit('receive-answer', { answer, from });
  });

  socket.on('ice-candidate', ({ candidate, to, from }) => {
    io.to(to).emit('receive-ice-candidate', { candidate, from });
  });
  
  // Handle Disconnect
  socket.on('disconnect', () => {
      if (socket.videoRoom && socket.userId) {
          socket.to(socket.videoRoom).emit('user-disconnected', socket.userId);
      }
  });
};

