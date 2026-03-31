/**
 * Chat Phase Socket Handlers
 * Handles real-time chat messaging during game and meetings
 */

const RoomManager = require('../rooms/roomManager');

/**
 * Register chat phase socket handlers
 */
function registerChatHandlers(socket, io) {
  
  // Handle message sending
  socket.on('send_message', async (data) => {
    try {
      const { message } = data;
      
      // Validate message exists and is non-empty
      if (!message || !message.trim()) {
        socket.emit('chat_error', { error: 'Message cannot be empty' });
        return;
      }
      
      // Validate message length
      if (message.trim().length > 200) {
        socket.emit('chat_error', { error: 'Message too long' });
        return;
      }
      
      // Get room code from socket (security - don't trust payload)
      const roomCode = await RoomManager.getPlayerRoom(socket.id);
      if (!roomCode) {
        socket.emit('chat_error', { error: 'Room not found' });
        return;
      }
      
      // Fetch room from Redis
      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        socket.emit('chat_error', { error: 'Room not found' });
        return;
      }
      
      // Validate game state
      if (room.gameState !== 'in-game' && room.gameState !== 'meeting') {
        socket.emit('chat_error', { error: 'Chat not available' });
        return;
      }
      
      // Find player in room
      const player = room.players.find(p => p.id === socket.id);
      if (!player) {
        return; // Silent fail if player not found
      }
      
      // Build message object
      const messageObject = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        playerId: socket.id,
        playerName: player.name,
        playerColor: player.color,
        message: message.trim(),
        timestamp: Date.now(),
        type: 'player'
      };
      
      // Broadcast to entire room INCLUDING sender
      io.to(roomCode).emit('new_message', messageObject);
      
      console.log(`💬 Message sent in room ${roomCode} by ${player.name}: ${messageObject.message.substring(0, 50)}...`);
      
    } catch (error) {
      console.error('❌ Error handling send_message:', error);
      socket.emit('chat_error', { error: 'Failed to send message' });
    }
  });
}

module.exports = {
  registerChatHandlers
};
