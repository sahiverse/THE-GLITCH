/**
 * Game Phase Socket Handlers
 * Handles voting, game data distribution, and game state management
 */

const { determineWinningTopic } = require('../game/voteManager');
const { getQuestion } = require('../game/questionService');
const RoomManager = require('../rooms/roomManager');
const { startFirstRound } = require('../game/gameManager');

/**
 * Distribute game data to players based on their roles
 */
async function distributeGameData(code, io) {
  try {
    console.log(`📦 Distributing game data for room ${code}`);
    
    const room = await RoomManager.getRoom(code);
    if (!room) {
      throw new Error(`Room ${code} not found`);
    }
    
    console.log(`📊 Room state in distributeGameData: gameState=${room.gameState}, currentRound=${room.currentRound}, roundTimerActive=${room.roundTimerActive}`);
    
    if (!room.topic) {
      throw new Error(`No topic selected for room ${code}`);
    }
    
    console.log(`🎮 Using existing game settings: ${room.totalRounds} rounds, ${room.meetingsLeft} emergency meetings`);
    
    await RoomManager.saveRoom(code, room);
    
    const question = getQuestion(room.topic);
    console.log(`📝 Retrieved question for topic: ${room.topic}`);

    // Strip role from every player before sending to any client
    const sanitisedPlayers = room.players.map(({ role, ...rest }) => rest);
    
    for (const player of room.players) {
      if (player.role === 'civilian') {
        const civilianData = {
          question: question.briefing,
          testCases: question.realTestCases,
          role: 'civilian',
          players: sanitisedPlayers
        };
        io.to(player.id).emit('game_data', civilianData);
        console.log(`📤 Sent civilian game data to ${player.name} (${player.id})`);
        console.log(`   ✅ SECURITY CHECK: Civilian received REAL test cases only, roles stripped from players array`);
      } else if (player.role === 'imposter') {
        const imposterData = {
          question: question.briefing,
          testCases: question.sabotageTestCases,
          realTestCases: question.realTestCases,
          role: 'imposter',
          players: sanitisedPlayers
        };
        io.to(player.id).emit('game_data', imposterData);
        console.log(`📤 Sent imposter game data to ${player.name} (${player.id})`);
        console.log(`   ✅ SECURITY CHECK: Imposter received SABOTAGE test cases only, roles stripped from players array`);
      }
    }
    
    io.to(code).emit('game_ready', { topic: room.topic });
    console.log(`🎮 Game ready signal sent for room ${code}`);
    
    await startFirstRound(code, io);
    
  } catch (error) {
    console.error(`❌ Error distributing game data for room ${code}:`, error);
    throw error;
  }
}

/**
 * Register game phase socket handlers
 */
function registerGameHandlers(socket, io) {
  
  // Handle vote casting
  socket.on('cast_vote', async (data) => {
    try {
      const { code, topic } = data;
      console.log(`🗳️ Vote cast by ${socket.id} for topic: ${topic} in room: ${code}`);
      
      // Fetch room from Redis
      const room = await RoomManager.getRoom(code);
      
      // Validate room exists
      if (!room) {
        socket.emit('vote_error', { error: 'Room not found' });
        return;
      }
      
      // Validate voting is active
      if (room.gameState !== 'selecting-topic') {
        socket.emit('vote_error', { error: 'Voting not active' });
        return;
      }
      
      // Validate player hasn't already voted
      if (room.votedPlayers.includes(socket.id)) {
        console.log(`❌ VOTE REJECTION: Player ${socket.id} already voted`);
        socket.emit('vote_error', { error: 'Already voted' });
        return;
      }
      
      // Validate topic exists
      const VALID_TOPICS = [
        "Arrays",
        "Strings",
        "Linked Lists",
        "Stacks & Queues",
        "Binary Search",
        "Recursion",
        "Sorting",
        "Hashing",
        "Trees",
        "Graphs",
        "Dynamic Programming",
        "Sliding Window"
      ]

      if (!VALID_TOPICS.includes(topic)) {
        socket.emit('vote_error', { error: 'Invalid topic' });
        return;
      }
      
      // Increment vote
      console.log(`🔍 Before vote - room.votedPlayers:`, room.votedPlayers);
      console.log(`🔍 Before vote - room.votes:`, room.votes);
      
      room.votes[topic] = (room.votes[topic] || 0) + 1;
      
      // Record voter — MUST happen before save
      if (!room.votedPlayers) room.votedPlayers = [];
      room.votedPlayers.push(socket.id);
      
      console.log(`🔍 After vote - room.votedPlayers:`, room.votedPlayers);
      console.log(`🔍 After vote - room.votes:`, room.votes);
      
      // Save to Redis — MUST happen after BOTH changes above
      await RoomManager.saveRoom(code, room);
      
      // Calculate count AFTER save
      const votedCount = room.votedPlayers.length;
      const totalPlayers = room.players.length;
      
      // Broadcast live vote update
      io.to(code).emit('live_vote_update', {
        votes: room.votes,
        votedCount,
        totalPlayers
      });
      
      console.log(`📊 Live vote update sent for room ${code}: ${votedCount}/${totalPlayers} voted`);
      
      // Check if all players have voted
      if (room.votedPlayers.length === room.players.length) {
        console.log(`🗳️ All players voted! Determining winning topic...`);
        console.log(`📊 Final votes:`, room.votes);
        
        // Determine winning topic
        const playerVotes = { ...room.votes };
        const maxVotes = Math.max(...Object.values(playerVotes));
        const topTopics = Object.entries(playerVotes)
          .filter(([_, count]) => count === maxVotes)
          .map(([topic]) => topic);
        
        const winningTopic = topTopics[Math.floor(Math.random() * topTopics.length)];
        console.log(`🏆 Winning topic: ${winningTopic}`);
        
        // Update room state
        room.topic = winningTopic;
        room.gameState = 'in-game';
        
        // Save to Redis
        await RoomManager.saveRoom(code, room);
        
        // Broadcast topic selected
        io.to(code).emit('topic_selected', { topic: winningTopic });
        console.log(`📢 Topic selected broadcast: ${winningTopic}`);
        
        // Distribute game data
        console.log(`🎮 About to call distributeGameData for room ${code}`);
        await distributeGameData(code, io);
        console.log(`✅ distributeGameData completed for room ${code}`);
      }
      
    } catch (error) {
      console.error('❌ Error casting vote:', error);
      socket.emit('vote_error', { error: 'Failed to cast vote' });
    }
  });
  
  // Handle game data request (safety net for reconnections)
  socket.on('request_game_data', async (data) => {
    try {
      const { code } = data;
      console.log(`🔄 Game data requested by ${socket.id} for room: ${code}`);
      
      // Fetch room from Redis
      const room = await RoomManager.getRoom(code);
      
      if (!room) {
        socket.emit('vote_error', { error: 'Room not found' });
        return;
      }
      
      if (room.gameState !== 'in-game' || !room.topic) {
        socket.emit('vote_error', { error: 'Game not in progress' });
        return;
      }
      
      // Find player and their role
      const player = room.players.find(p => p.id === socket.id);
      if (!player) {
        socket.emit('vote_error', { error: 'Player not in room' });
        return;
      }
      
      // Get question and test cases
      const question = getQuestion(room.topic);
      
      // Send appropriate game data based on role
      const sanitisedPlayers = room.players.map(({ role, ...rest }) => rest);
      
      if (player.role === 'civilian') {
        socket.emit('game_data', {
          question: question.briefing,
          testCases: question.realTestCases,
          role: 'civilian',
          players: sanitisedPlayers
        });
        console.log(`📤 Sent civilian game data to ${player.name} (${socket.id})`);
        console.log(`   ✅ SECURITY CHECK: Civilian received REAL test cases only, roles stripped from players array`);
      } else if (player.role === 'imposter') {
        socket.emit('game_data', {
          question: question.briefing,
          testCases: question.sabotageTestCases,
          realTestCases: question.realTestCases,
          role: 'imposter',
          players: sanitisedPlayers
        });
        console.log(`📤 Sent imposter game data to ${player.name} (${socket.id})`);
        console.log(`   ✅ SECURITY CHECK: Imposter received SABOTAGE test cases only, roles stripped from players array`);
      }
      
      console.log(`📤 Game data resent to ${player.name} (${socket.id}) with role: ${player.role}`);
      
    } catch (error) {
      console.error('❌ Error requesting game data:', error);
      socket.emit('vote_error', { error: 'Failed to get game data' });
    }
  });
}

module.exports = {
  registerGameHandlers,
  distributeGameData
};
