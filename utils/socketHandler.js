module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('join channel', (channelId) => {
      socket.join(channelId);
    });

    socket.on('new comment', (data) => {
      io.to(data.channelId).emit('comment', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};
