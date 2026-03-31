/**
 * Editor Phase Socket Handlers
 * Handles collaborative code editing with cursor tracking
 */

const RoomManager = require('../rooms/roomManager');

// In-memory cursor store — cursors are ephemeral, no need for Redis persistence
const roomCursors = new Map();

/**
 * Register editor phase socket handlers
 */
function registerEditorHandlers(socket, io) {
  
  // Handle code updates from clients
  socket.on('code_update', async (data) => {
    try {
      const { code, cursorOffset, selection } = data;
      console.log(`📝 Code update from ${socket.id}:`, { codeLength: code.length, cursorOffset, selection });
      
      // Find room code from player mapping
      const roomCode = await RoomManager.getPlayerRoom(socket.id);
      if (!roomCode) {
        console.log(`❌ Player ${socket.id} not in any room`);
        return;
      }
      
      // Fetch room from Redis
      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        console.log(`❌ Room ${roomCode} not found`);
        return;
      }
      
      // Validate game state
      if (room.gameState !== 'in-game' && room.gameState !== 'meeting') {
        socket.emit('editor_error', { error: 'Game not active' });
        return;
      }
      
      // Find player data
      const player = room.players.find(p => p.id === socket.id);
      if (!player) {
        console.log(`❌ Player ${socket.id} not found in room ${roomCode}`);
        return;
      }
      
      // Update room state
      room.sharedCode = code;
      room.cursors = room.cursors || {};
      
      // Validate player is not locked out for SENDING updates
      if (room.lockedPlayers && room.lockedPlayers.includes(socket.id)) {
        socket.emit('editor_error', { error: 'You have been voted out' });
        return;
      }
      room.cursors[socket.id] = {
        playerId: socket.id,
        playerName: player.name,
        color: player.color,
        cursorOffset: cursorOffset,
        selection: selection
      };
      
      // Save to Redis
      await RoomManager.saveRoom(roomCode, room);
      
      // Broadcast to room excluding sender
      const syncData = {
        code: code,
        cursors: room.cursors,
        updatedBy: socket.id
      };
      
      console.log(`📡 Broadcasting code_synced:`, {
        codeLength: code?.length || 0,
        codePreview: code?.substring(0, 50) + (code?.length > 50 ? '...' : ''),
        updatedBy: socket.id,
        cursorsCount: Object.keys(room.cursors || {}).length
      });
      
      socket.to(roomCode).emit('code_synced', syncData);
      
      console.log(`📡 Code synced to room ${roomCode} (excluding sender)`);
      
    } catch (error) {
      console.error('❌ Error handling code update:', error);
      socket.emit('editor_error', { error: 'Failed to update code' });
    }
  });
  
  // Handle cursor updates from clients
  socket.on('cursor_update', async (data) => {
    try {
      const { cursorOffset, selection } = data;
      
      // Find room code from player mapping
      const roomCode = await RoomManager.getPlayerRoom(socket.id);
      if (!roomCode) return;
      
      // Fetch room from Redis only to validate state and get player info
      const room = await RoomManager.getRoom(roomCode);
      if (!room || room.gameState !== 'in-game') return;
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;
      
      // Validate player is not locked out for SENDING cursor updates
      if (room.lockedPlayers && room.lockedPlayers.includes(socket.id)) {
        socket.emit('editor_error', { error: 'You have been voted out' });
        return;
      }
      
      // Store cursor in memory only — no Redis write
      if (!roomCursors.has(roomCode)) roomCursors.set(roomCode, {});
      roomCursors.get(roomCode)[socket.id] = {
        playerId: socket.id,
        playerName: player.name,
        color: player.color,
        cursorOffset,
        selection
      };
      
      // Broadcast to room excluding sender
      socket.to(roomCode).emit('cursor_synced', {
        cursors: roomCursors.get(roomCode)
      });
      
    } catch (error) {
      console.error('❌ Error handling cursor update:', error);
    }
  });
  
  // Handle request for current code (reconnections)
  socket.on('request_current_code', async (data) => {
    try {
      const { code: roomCode } = data;
      console.log(`📥 Current code requested by ${socket.id} for room ${roomCode}`);
      
      // Fetch room from Redis
      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        socket.emit('editor_error', { error: 'Room not found' });
        return;
      }
      
      console.log(`📥 Current code requested by ${socket.id} for room ${roomCode}`);
      console.log(`🔍 Room sharedCode content: "${room.sharedCode}" (length: ${room.sharedCode?.length || 0})`);
      
      // Send current state only to requesting socket
      socket.emit('code_synced', {
        code: room.sharedCode || '',
        cursors: room.cursors || {},
        updatedBy: null
      });
      
      console.log(`📤 Current code sent to ${socket.id}`);
      
    } catch (error) {
      console.error('❌ Error handling current code request:', error);
      socket.emit('editor_error', { error: 'Failed to get current code' });
    }
  });
}

/**
 * Handle player disconnect for editor cleanup
 */
async function handlePlayerDisconnect(socket, io) {
  try {
    // Find room code from player mapping
    const roomCode = await RoomManager.getPlayerRoom(socket.id);
    if (!roomCode) {
      return; // Player not in any room
    }
    
    // Fetch room from Redis
    const room = await RoomManager.getRoom(roomCode);
    if (!room) {
      return; // Room not found
    }
    
    // Remove player's cursor from in-memory store
    if (roomCursors.has(roomCode)) {
      delete roomCursors.get(roomCode)[socket.id];
      
      // Broadcast updated cursors so disconnected player's cursor disappears
      socket.to(roomCode).emit('cursor_synced', {
        cursors: roomCursors.get(roomCode)
      });
      
      console.log(`👋 Removed cursor for disconnected player ${socket.id} from room ${roomCode}`);
      
      // Clean up empty room cursor map
      if (Object.keys(roomCursors.get(roomCode)).length === 0) {
        roomCursors.delete(roomCode);
      }
    }
    
  } catch (error) {
    console.error('❌ Error handling player disconnect for editor:', error);
  }
}

module.exports = {
  registerEditorHandlers,
  handlePlayerDisconnect
};
