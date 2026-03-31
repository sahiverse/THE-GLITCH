/**
 * Game Orchestrator
 * Manages the complete game start sequence
 */

const Redis = require('redis');
const { assignRoles } = require('./roleManager');
const { getTopicList } = require('./questionService');
const RoomManager = require('../rooms/roomManager');
const { startRound } = require('./roundManager');

const redis = Redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

/**
 * Initialize game: assign roles and start topic selection
 */
async function initGame(code, io) {
  try {
    console.log(`🎮 Initializing game for room ${code}`);
    
    // Fetch room from Redis
    const room = await RoomManager.getRoom(code);
    if (!room) {
      throw new Error(`Room ${code} not found`);
    }
    
    console.log(`📋 Room ${code} has ${room.players.length} players`);
    
    // Step 1: Assign roles
    const { players: updatedPlayers, imposterId } = assignRoles(room.players);
    console.log(`🎭 Roles assigned - Imposter: ${imposterId}`);
    
    // Step 2: Initialize votes for all topics
    const topicList = getTopicList();
    const votes = {};
    topicList.forEach(topic => {
      votes[topic] = 0;
    });
    
    // Step 3: Update room state
    room.players = updatedPlayers;
    room.imposterId = imposterId;
    room.gameState = 'selecting-topic';
    room.votes = votes;
    room.votedPlayers = [];
    room.topic = null;
    
    // Step 4: Initialize Phase 5 meeting fields
    room.meetingsLeft = updatedPlayers.length <= 4 ? 2 : 3;
    room.currentMeetingVotes = {};
    room.activeMeeting = false;
    room.meetingCaller = null;
    
    // Step 5: Initialize Phase 6 round system fields
    room.currentRound = 0;
    // Dynamic rounds based on player count
    room.totalRounds = updatedPlayers.length <= 4 ? 2 : 3;
    room.roundTimeLeft = 420;
    room.roundTimerActive = false;
    
    // Step 6: Set game state for topic selection
    room.gameState = 'selecting-topic';
    
    // Save updated room to Redis
    await RoomManager.saveRoom(code, room);
    console.log(`💾 Room ${code} updated with roles and voting state`);
    console.log(`🎯 Room ${code} has ${updatedPlayers.length} players → ${room.totalRounds} rounds`);
    console.log(`📊 GameState set to 'selecting-topic' for room ${code}`);
    
    // Step 6: Send individual role assignments (NEVER broadcast)
    for (const player of updatedPlayers) {
      if (player.role === 'imposter') {
        io.to(player.id).emit('role_assigned', { role: 'imposter' });
        console.log(`🎭 Imposter role sent to ${player.name} (${player.id})`);
      } else {
        io.to(player.id).emit('role_assigned', { role: 'civilian' });
        console.log(`👤 Civilian role sent to ${player.name} (${player.id})`);
      }
    }
    
    // Step 7: Broadcast topic selection start to entire room
    io.to(code).emit('topic_selection_start', { topics: topicList });
    console.log(`📊 Topic selection started for room ${code} with ${topicList.length} topics`);
    
  } catch (error) {
    console.error(`❌ Error initializing game for room ${code}:`, error);
    throw error;
  }
}

/**
 * Start first round after game transitions to editor
 */
async function startFirstRound(code, io) {
  try {
    console.log(`🎯 startFirstRound called for room ${code}`);
    
    // Small delay to let clients transition to editor screen
    setTimeout(async () => {
      console.log(`⏰ Delay complete, calling startRound for room ${code}`);
      try {
        await startRound(code, io);
        console.log(`✅ startRound completed successfully for room ${code}`);
      } catch (error) {
        console.error(`❌ startRound failed for room ${code}:`, error);
      }
    }, 2000);
    
  } catch (error) {
    console.error(`❌ Error in startFirstRound for room ${code}:`, error);
  }
}

module.exports = {
  initGame,
  startFirstRound
};
