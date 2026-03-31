/**
 * Language Selection Handler
 * Allows host to select programming language for all players
 */

const languageSelectionHandler = (io, socket) => {
  // Handle language change from host
  socket.on('language_change', async (data) => {
    try {
      const { code, language } = data;
      console.log(`🔤 Language change requested: ${language} for room ${code}`);
      console.log(`🔤 Socket ID requesting change: ${socket.id}`);
      console.log(`🔤 Emit data received:`, data);
      
      // Validate language
      const supportedLanguages = ['python', 'javascript', 'java', 'cpp', 'csharp'];
      if (!supportedLanguages.includes(language)) {
        console.log(`❌ Unsupported language: ${language}`);
        socket.emit('error', { message: 'Unsupported language' });
        return;
      }
      
      // Get room from Redis
      const RoomManager = require('../rooms/roomManager');
      const room = await RoomManager.getRoom(code);
      
      if (!room) {
        console.log(`❌ Room not found: ${code}`);
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      console.log(`🔤 Room found: ${room.name}, current language: ${room.language}`);
      
      // Update room language
      room.language = language;
      await RoomManager.saveRoom(code, room);
      
      console.log(`🔤 Broadcasting language change to room ${code}`);
      
      // Broadcast language change to all players in room
      const broadcastData = {
        language: language,
        changedBy: socket.id
      };
      console.log(`🔤 Broadcasting data:`, broadcastData);
      
      io.to(code).emit('language_changed', broadcastData);
      
      console.log(`✅ Language updated to ${language} for room ${code}`);
      
    } catch (error) {
      console.error('❌ Language change error:', error);
      socket.emit('error', { message: 'Failed to change language' });
    }
  });
};

module.exports = {
  languageSelectionHandler
};
