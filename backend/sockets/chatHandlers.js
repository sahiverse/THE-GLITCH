/**
 * Chat Socket Handlers
 * 
 * Handles real-time messaging during game sessions and emergency meetings.
 * Validates game state, player permissions, and message content before broadcast.
 * 
 * Security: Room code is derived from socket session (stored in Redis) rather than
 * trusting the client payload, preventing message spoofing across rooms.
 */

const RoomManager = require('../rooms/roomManager');

/**
 * Register chat-related socket event handlers
 * @param {Socket} socket - Socket.io socket instance
 * @param {Server} io - Socket.io server instance
 */
function registerChatHandlers(socket, io) {
  
  /**
   * Handle incoming chat messages from players
   * 
   * Validation:
   * - Message must be non-empty and under 200 characters
   * - Player must be in an active game room
   * - Game state must be 'in-game' or 'meeting'
   * 
   * Broadcasts validated message to all players in room including sender.
   */
  socket.on('send_message', async (data) => {
    try {
      const { message } = data;
      
      // Validate message exists and is non-empty
      if (!message || !message.trim()) {
        socket.emit('chat_error', { error: 'Message cannot be empty' });
        return;
      }
      
      // Validate message length (prevent spam/abuse)
      if (message.trim().length > 200) {
        socket.emit('chat_error', { error: 'Message too long' });
        return;
      }
      
      /**
       * Security: Derive room from socket session, not client payload.
       * Prevents spoofed messages by validating socket.id -> room mapping
       * stored in Redis during room join handshake.
       */
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
      
      // Validate game state - chat only available during active play or meetings
      if (room.gameState !== 'in-game' && room.gameState !== 'meeting') {
        socket.emit('chat_error', { error: 'Chat not available' });
        return;
      }
      
      // Find player in room
      const player = room.players.find(p => p.id === socket.id);
      if (!player) {
        return; // Silent fail if player not found
      }
      
      // Build message object with metadata for display
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
      console.error('Error handling send_message:', error);
      socket.emit('chat_error', { error: 'Failed to send message' });
    }
  });
}

module.exports = {
  registerChatHandlers
};
