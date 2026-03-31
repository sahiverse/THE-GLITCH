const roomHandlers = require('./roomHandlers');
const { registerGameHandlers } = require('./gameHandlers');
const { registerEditorHandlers, handlePlayerDisconnect } = require('./editorHandlers');
const { registerChatHandlers } = require('./chatHandlers');
const { registerMeetingHandlers } = require('./meetingHandlers');
const { languageSelectionHandler } = require('./languageHandlers');
const { registerSubmitHandlers } = require('./submitHandlers');

const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Register room handlers
    roomHandlers(io, socket);
    
    // Register game handlers
    registerGameHandlers(socket, io);
    
    // Register editor handlers
    registerEditorHandlers(socket, io);
    
    // Register chat handlers
    registerChatHandlers(socket, io);
    
    // Register meeting handlers
    registerMeetingHandlers(socket, io);
    
    // Register language handler
    languageSelectionHandler(io, socket);
    
    // Register submit handlers
    registerSubmitHandlers(socket, io);

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      
      // Handle editor cleanup for disconnected player
      handlePlayerDisconnect(socket, io);
    });
  });
};

module.exports = registerSocketHandlers;
