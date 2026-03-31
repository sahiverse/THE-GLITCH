/**
 * Meeting Phase Socket Handlers
 * Handles emergency meetings and voting
 */

const RoomManager = require('../rooms/roomManager');
const { initMeeting, castMeetingVote } = require('../game/meetingManager');

/**
 * Register meeting phase socket handlers
 */
function registerMeetingHandlers(socket, io) {
  
  // Handle emergency meeting call
  socket.on('emergency_meeting', async (data) => {
    try {
      // Get room code from socket
      const roomCode = await RoomManager.getPlayerRoom(socket.id);
      if (!roomCode) {
        socket.emit('meeting_error', { error: 'Room not found' });
        return;
      }
      
      // Get room object
      const room = await RoomManager.getRoom(roomCode);
      
      // Validate room and meeting state
      if (!room.meetingsLeft || room.meetingsLeft <= 0) {
        socket.emit('meeting_error', { error: 'No meetings left' });
        return;
      }
      
      // Initialize meeting - ANY player can call emergency meeting
      await initMeeting(roomCode, socket.id, io);
      
    } catch (error) {
      console.error('❌ Error handling emergency_meeting:', error);
      socket.emit('meeting_error', { error: error.message });
    }
  });
  
  // Handle meeting vote casting
  socket.on('cast_meeting_vote', async (data) => {
    try {
      const { targetId } = data;
      
      // Get room code from socket
      const roomCode = await RoomManager.getPlayerRoom(socket.id);
      if (!roomCode) {
        socket.emit('vote_error', { error: 'Room not found' });
        return;
      }
      
      // Cast vote with validation
      await castMeetingVote(roomCode, socket.id, targetId, io);
      
    } catch (error) {
      console.error('❌ Error casting vote in room', roomCode, ':', error.message);
      // Send error to client but don't crash
      socket.emit('vote_error', { error: error.message });
    }
  });
}

module.exports = {
  registerMeetingHandlers
};
