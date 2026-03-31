/**
 * Round Manager
 * Handles round timing, forced meetings, and round progression
 */

const RoomManager = require('../rooms/roomManager');
const { initMeeting } = require('./meetingManager');

// In-memory timer storage - never stored in Redis
const roundTimers = new Map();

/**
 * Start a new round
 */
async function startRound(roomCode, io) {
  try {
    console.log(`🎯 startRound called for room ${roomCode}`);
    
    const room = await RoomManager.getRoom(roomCode);
    if (!room) {
      console.error(`❌ Room ${roomCode} not found in startRound`);
      throw new Error('Room not found');
    }

    // ✅ FIX: Hard stop if game is already over
    if (room.gameState === 'ended') {
      console.log(`� startRound blocked — game already ended in room ${roomCode}`);
      return;
    }

    // ✅ FIX: Hard stop if all rounds already completed
    if (room.currentRound >= room.totalRounds) {
      console.log(`🛑 startRound blocked — all rounds complete (${room.currentRound}/${room.totalRounds})`);
      room.gameState = 'ended';
      await RoomManager.saveRoom(roomCode, room);
      io.to(roomCode).emit('game_over', {
        winner: 'imposter',
        imposterId: room.imposterId,
        message: `All ${room.totalRounds} rounds complete. The imposter was never found. Imposter wins!` 
      });
      return;
    }

    // ✅ ADD THIS DEBUG
    console.log(`🔍 DEBUG startRound BEFORE increment:`, {
      currentRound: room.currentRound,
      totalRounds: room.totalRounds
    });
    
    // In startRound, right after fetching room:
    console.log('🎯 startRound: room fetched:', {
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      gameState: room.gameState,
      roundTimeLeft: room.roundTimeLeft
    });
    
    console.log(`📊 Room state before timer start: gameState=${room.gameState}, roundTimerActive=${room.roundTimerActive}, currentRound=${room.currentRound}`);
    
    // Validate game state
    if (room.gameState !== 'in-game') {
      console.error(`❌ Cannot start round - gameState is '${room.gameState}' (expected: 'in-game')`);
      throw new Error('Round can only start during game');
    }
    
    // Update round state
    room.currentRound += 1;
    room.roundTimeLeft = 420; // 7 minutes
    room.roundTimerActive = true;
    
    // ✅ ADD THIS DEBUG
    console.log(`🔍 DEBUG startRound AFTER increment:`, {
      currentRound: room.currentRound,
      totalRounds: room.totalRounds
    });
    
    console.log(`📊 Room state after timer start: roundTimerActive=${room.roundTimerActive}, roundTimeLeft=${room.roundTimeLeft}, currentRound=${room.currentRound}`);
    
    // Save to Redis
    await RoomManager.saveRoom(roomCode, room);
    console.log(`💾 Room saved to Redis with roundTimerActive=${room.roundTimerActive}`);
    
    // Broadcast round start
    io.to(roomCode).emit('round_started', {
      round: room.currentRound,
      totalRounds: room.totalRounds,
      timeLeft: room.roundTimeLeft,
      meetingsLeft: room.meetingsLeft
    });
    
    // Start server interval (runs every second)
    console.log(`⏰ Creating setInterval for room ${roomCode}`);
    // Kill any existing interval before creating new one
    cleanupTimer(roomCode);
    
    // ✅ CRITICAL FIX: Wait 200ms to ensure Redis save completes before starting interval
    setTimeout(async () => {
      try {
        // Verify that room state was saved correctly
        const verifyRoom = await RoomManager.getRoom(roomCode);
        console.log(`🔍 DEBUG startRound verification:`, {
          roomExists: !!verifyRoom,
          gameState: verifyRoom?.gameState,
          roundTimerActive: verifyRoom?.roundTimerActive,
          currentRound: verifyRoom?.currentRound,
          roundTimeLeft: verifyRoom?.roundTimeLeft
        });
        
        if (!verifyRoom || !verifyRoom.roundTimerActive) {
          console.error(`❌ VERIFICATION FAILED! Timer will NOT start.`);
          console.error(`   roundTimerActive: ${verifyRoom?.roundTimerActive}`);
          return; // EXIT HERE - no timer!
        }
        
        console.log(`✅ VERIFICATION PASSED! Starting timer now.`);
        
        // NOW safe to start the interval
        const interval = setInterval(async () => {
          console.log(`⏰ setInterval callback triggered for room ${roomCode}`);
          await tickRound(roomCode, io);
        }, 1000);
        
        roundTimers.set(roomCode, interval);
        console.log(`⏰ setInterval STARTED for room ${roomCode}, total timers: ${roundTimers.size}`);
        
      } catch (error) {
        console.error(`❌ Error verifying Redis state for room ${roomCode}:`, error);
      }
    }, 200); // Wait 200ms for Redis to persist
    
  } catch (error) {
    console.error(`❌ Error starting round in room ${roomCode}:`, error);
    throw error;
  }
}

/**
 * Handle timer tick (every second)
 */
async function tickRound(roomCode, io) {
  try {
    console.log(`⏰ tickRound called for room ${roomCode}`);
    
    // Fetch room from Redis
    const room = await RoomManager.getRoom(roomCode);
    console.log(`📊 Room state in tickRound: room=${!!room}, gameState=${room?.gameState}, roundTimerActive=${room?.roundTimerActive}, timeLeft=${room?.roundTimeLeft}`);
    
    if (!room || !room.roundTimerActive) {
      console.log(`⏰ Timer stopping for room ${roomCode}: room=${!!room}, timerActive=${room?.roundTimerActive}`);
      // Clear timer if room doesn't exist or timer is inactive
      clearInterval(roundTimers.get(roomCode));
      roundTimers.delete(roomCode);
      console.log(`⏰ Timer cleared for room ${roomCode}, remaining timers: ${roundTimers.size}`);
      return;
    }
    
    // Decrement time
    room.roundTimeLeft -= 1;
    
    console.log(`⏰ Timer tick for room ${roomCode}: ${room.roundTimeLeft}s remaining`);
    
    // Save to Redis
    await RoomManager.saveRoom(roomCode, room);
    
    // Broadcast timer tick
    io.to(roomCode).emit('timer_tick', {
      timeLeft: room.roundTimeLeft,
      round: room.currentRound
    });
    
    console.log(`📡 timer_tick emitted: timeLeft=${room.roundTimeLeft}, round=${room.currentRound}`);
    
    // Check if time is up
    if (room.roundTimeLeft <= 0) {
      clearInterval(roundTimers.get(roomCode));
      roundTimers.delete(roomCode);
      room.roundTimerActive = false;
      room.forcedMeetingPending = true;   // ← flag instead of immediate trigger
      await RoomManager.saveRoom(roomCode, room);
      
      // Only trigger forced meeting if no active meeting right now
      if (!room.activeMeeting) {
        room.forcedMeetingPending = false;
        await RoomManager.saveRoom(roomCode, room);
        await triggerForcedMeeting(roomCode, io);
      }
      // If meeting IS active, forcedMeetingPending = true
      // meetingManager.resolveMeeting will check this flag after meeting ends
    }
    
  } catch (error) {
    console.error(`❌ Error in timer tick for room ${roomCode}:`, error);
  }
}

/**
 * Pause round timer (during meetings)
 */
async function pauseRound(roomCode) {
  try {
    // Fetch room from Redis
    const room = await RoomManager.getRoom(roomCode);
    if (!room) return;
    
    // Update state
    room.roundTimerActive = false;
    
    // Save to Redis
    await RoomManager.saveRoom(roomCode, room);
    
    // Clear interval
    clearInterval(roundTimers.get(roomCode));
    roundTimers.delete(roomCode);
    
    console.log(`⏸️ Round timer paused in room ${roomCode} (${room.roundTimeLeft}s remaining)`);
    
  } catch (error) {
    console.error(`❌ Error pausing round in room ${roomCode}:`, error);
  }
}

/**
 * Resume round timer (after manual meetings)
 */
async function resumeRound(roomCode, io) {
  try {
    const room = await RoomManager.getRoom(roomCode);
    if (!room) return;

    // If time ran out, this is effectively a round end — start next round
    if (room.roundTimeLeft <= 0) {
      // In resumeRound, after the roundTimeLeft <= 0 check:
      console.log('🔄 resumeRound: roundTimeLeft is 0, checking rounds:', {
        currentRound: room.currentRound,
        totalRounds: room.totalRounds
      });
      
      if (room.currentRound < room.totalRounds) {
        // Kill any stale interval before starting new round
        cleanupTimer(roomCode);
        
        // More rounds left — start next round after a short delay
        io.to(roomCode).emit('round_ending', {
          message: `Round ${room.currentRound} complete. Next round starting in 3 seconds...`,
          nextRound: room.currentRound + 1,
          totalRounds: room.totalRounds
        });
        setTimeout(async () => {
          await startRound(roomCode, io);
        }, 3000);
      } else {
        // All rounds done — imposter wins
        room.gameState = 'ended';
        await RoomManager.saveRoom(roomCode, room);
        io.to(roomCode).emit('game_over', {
          winner: 'imposter',
          imposterId: room.imposterId,
          message: `All ${room.totalRounds} rounds complete. The imposter was never found. Imposter wins!` 
        });
      }
      return;
    }

    // Normal resume — time still remaining, just unpause
    if (room.currentRound > room.totalRounds) return;

    room.roundTimerActive = true;
    await RoomManager.saveRoom(roomCode, room);

    // ✅ CRITICAL FIX: Verify before starting interval
    setTimeout(async () => {
      try {
        const verifyRoom = await RoomManager.getRoom(roomCode);
        if (!verifyRoom || !verifyRoom.roundTimerActive) {
          console.error(`❌ Resume verification failed: roundTimerActive = ${verifyRoom?.roundTimerActive}`);
          return;
        }
        
        console.log(`✅ Resume Redis verified: roundTimerActive = true, starting interval`);
        
        const interval = setInterval(async () => {
          await tickRound(roomCode, io);
        }, 1000);
        
        roundTimers.set(roomCode, interval);
        console.log(`▶️ Round timer resumed in room ${roomCode} (${room.roundTimeLeft}s remaining)`);
        
      } catch (error) {
        console.error(`❌ Error verifying resume state for room ${roomCode}:`, error);
      }
    }, 200); // Wait 200ms for Redis to persist

    io.to(roomCode).emit('round_resumed', {
      timeLeft: room.roundTimeLeft,
      round: room.currentRound
    });

  } catch (error) {
    console.error(`❌ Error resuming round in room ${roomCode}:`, error);
  }
}

/**
 * Trigger forced meeting when time runs out
 */
async function triggerForcedMeeting(roomCode, io) {
  try {
    // Fetch room from Redis
    const room = await RoomManager.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }
    
    // Update room for meeting
    room.gameState = 'meeting';
    room.activeMeeting = true;
    room.meetingCaller = 'system';
    room.currentMeetingVotes = {};
    
    // Save to Redis
    await RoomManager.saveRoom(roomCode, room);
    
    // Broadcast forced meeting start
    io.to(roomCode).emit('meeting_started', {
      callerName: 'SYSTEM',
      callerId: 'system',
      isForced: true,
      players: room.players,
      lockedPlayers: room.lockedPlayers || [],
      meetingsLeft: room.meetingsLeft,
      round: room.currentRound,
      isLastRound: room.currentRound >= room.totalRounds
    });
    
    console.log(`⏰ Forced meeting triggered in room ${roomCode} (round ${room.currentRound})`);
    
  } catch (error) {
    console.error(`❌ Error triggering forced meeting in room ${roomCode}:`, error);
  }
}

/**
 * Handle round end after meeting resolution
 */
async function handleRoundEnd(roomCode, outcome, io) {
  if (outcome.gameOver) return
  
  const room = await RoomManager.getRoom(roomCode)
  if (!room) return
  
  if (room.currentRound < room.totalRounds) {
    // More rounds remaining — start next round automatically
    io.to(roomCode).emit('round_ending', {
      message: `Round ${room.currentRound} complete. Next round starting in 3 seconds...`,
      nextRound: room.currentRound + 1,
      totalRounds: room.totalRounds
    })
    setTimeout(async () => {
      await startRound(roomCode, io)
    }, 3000)
  } else {
    // All rounds done — imposter wins
    room.gameState = 'ended'
    await RoomManager.saveRoom(roomCode, room)
    io.to(roomCode).emit('game_over', {
      winner: 'imposter',
      imposterId: room.imposterId,
      message: `All ${room.totalRounds} rounds complete. The imposter was never found. Imposter wins!` 
    })
  }
}

/**
 * Clean up timer when room is destroyed
 */
function cleanupTimer(roomCode) {
  clearInterval(roundTimers.get(roomCode));
  roundTimers.delete(roomCode);
  console.log(`🧹 Cleaned up timer for room ${roomCode}`);
}

module.exports = {
  startRound,
  pauseRound,
  resumeRound,
  triggerForcedMeeting,
  handleRoundEnd,
  cleanupTimer
};
