/**
 * Meeting Manager
 * Handles emergency meeting logic, vote tallying, and win conditions
 */

const RoomManager = require('../rooms/roomManager');

/**
 * Initialize an emergency meeting
 */
async function initMeeting(roomCode, callerId, io) {
  try {
    // Fetch room from Redis
    const room = await RoomManager.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }
    
    // Validate meeting can be called
    if (room.gameState !== 'in-game') {
      throw new Error('Meeting can only be called during game');
    }
    
    if (room.activeMeeting === true) {
      throw new Error('Meeting already in progress');
    }
    
    if (room.lockedPlayers && room.lockedPlayers.includes(callerId)) {
      throw new Error('Voted out players cannot call meetings');
    }
    
    if (!room.meetingsLeft || room.meetingsLeft <= 0) {
      throw new Error('No meetings left');
    }
    
    // Update room state
    room.gameState = 'meeting';
    room.activeMeeting = true;
    room.meetingCaller = callerId;
    room.meetingsLeft -= 1;
    room.currentMeetingVotes = {};
    
    // Save to Redis
    await RoomManager.saveRoom(roomCode, room);
    
    // Pause round timer during manual meeting
    const roundManager = require('./roundManager');
    await roundManager.pauseRound(roomCode);
    
    // Find caller name
    const caller = room.players.find(p => p.id === callerId);
    const callerName = caller ? caller.name : 'Unknown';
    
    // Broadcast to entire room
    io.to(roomCode).emit('meeting_started', {
      callerName,
      callerId,
      players: room.players,
      lockedPlayers: room.lockedPlayers || [],
      meetingsLeft: room.meetingsLeft
    });
    
    console.log(`🚨 Emergency meeting started in room ${roomCode} by ${callerName}`);
    
  } catch (error) {
    console.error(`❌ Error initializing meeting in room ${roomCode}:`, error);
    throw error;
  }
}

/**
 * Cast a vote in the current meeting
 */
async function castMeetingVote(roomCode, voterId, targetId, io) {
  try {
    // Fetch room from Redis
    const room = await RoomManager.getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }
    
    // Validate voting
    if (room.gameState !== 'meeting') {
      throw new Error('No meeting in progress');
    }
    
    if (room.activeMeeting !== true) {
      throw new Error('No active meeting');
    }
    
    if (room.currentMeetingVotes[voterId] !== undefined) {
      throw new Error('Already voted');
    }
    
    // Validate target
    if (targetId !== 'skip') {
      const targetPlayer = room.players.find(p => p.id === targetId);
      if (!targetPlayer) {
        throw new Error('Invalid vote target');
      }
      
      if (room.lockedPlayers && room.lockedPlayers.includes(targetId)) {
        throw new Error('Cannot vote for voted-out player');
      }
      
      if (targetId === voterId) {
        throw new Error('Cannot vote for yourself');
      }
    }
    
    // Record vote
    room.currentMeetingVotes[voterId] = targetId;
    
    // Save to Redis
    await RoomManager.saveRoom(roomCode, room);
    
    // Get voting progress
    const votedCount = Object.keys(room.currentMeetingVotes).length;
    // All players can vote including dead ones
    const totalVoters = room.players.length;
    
    // Broadcast vote progress
    io.to(roomCode).emit('vote_update', {
      votedCount,
      totalVoters
    });
    
    console.log(`🗳️ Vote cast in room ${roomCode}: ${voterId} → ${targetId} (${votedCount}/${totalVoters})`);
    
    // All players must vote before resolving
    const allVoted = room.players.every(p => room.currentMeetingVotes[p.id] !== undefined);
    
    if (allVoted) {
      console.log(`🏁 All votes cast in room ${roomCode}, resolving meeting`);
      await resolveMeeting(roomCode, io);
    }
    
  } catch (error) {
    console.error(`❌ Error casting vote in room ${roomCode}:`, error);
    throw error;
  }
}

/**
 * Resolve the meeting and determine outcome
 */
async function resolveMeeting(roomCode, io) {
  try {
    const room = await RoomManager.getRoom(roomCode);
    if (!room) throw new Error('Room not found');

    const isForcedMeeting = room.meetingCaller === 'system';
    console.log(`📋 Meeting was ${isForcedMeeting ? 'FORCED' : 'MANUAL'}`);

    let outcome;
    const votes = room.currentMeetingVotes;
    const totalVotes = Object.values(votes).length;

    const tally = {};
    Object.values(votes).forEach(targetId => {
      tally[targetId] = (tally[targetId] || 0) + 1;
    });

    const skipVotes = tally['skip'] || 0;

    if (!isForcedMeeting) {
      const skipPercentage = skipVotes / totalVotes;
      if (skipPercentage >= 0.5) {
        outcome = {
          type: 'tie',
          message: 'With no consensus reached, game continues.',
          gameOver: false
        };
      }
    }

    if (!outcome) {
      const playerTally = { ...tally };
      delete playerTally['skip'];
      const maxVotes = Math.max(...Object.values(playerTally), 0);

      if (maxVotes === 0) {
        outcome = {
          type: 'tie',
          message: isForcedMeeting ? 'No votes cast.' : 'No votes cast. Returning to game.',
          gameOver: false,
        };
      } else {
        const topPlayers = Object.entries(playerTally)
          .filter(([_, count]) => count === maxVotes)
          .map(([playerId]) => playerId);
        const topPlayerPercentage = maxVotes / totalVotes;

        if (topPlayers.length > 1) {
          outcome = {
            type: 'tie',
            message: isForcedMeeting ? 'Votes are tied.' : 'Votes are tied. No consensus. Returning to game.',
            gameOver: false,
          };
        } else if (!isForcedMeeting && topPlayerPercentage <= 0.5) {
          outcome = {
            type: 'tie',
            message: 'No majority reached. Returning to game.',
            gameOver: false
          };
        } else {
          const eliminatedId = topPlayers[0];
          const eliminatedPlayer = room.players.find(p => p.id === eliminatedId);
          const eliminatedName = eliminatedPlayer ? eliminatedPlayer.name : 'Unknown';

          if (!room.lockedPlayers) room.lockedPlayers = [];
          room.lockedPlayers.push(eliminatedId);

          const remainingPlayers = room.players.filter(p => !room.lockedPlayers.includes(p.id));
          const remainingCivilians = remainingPlayers.filter(p => p.id !== room.imposterId);

          if (eliminatedId === room.imposterId) {
            outcome = {
              type: 'eliminated',
              eliminatedId,
              eliminatedName,
              gameOver: true,
              winner: 'civilians',
              message: `${eliminatedName} was the imposter! Civilians win!` 
            };
          } else if (remainingCivilians.length === 0) {
            outcome = {
              type: 'eliminated',
              eliminatedId,
              eliminatedName,
              gameOver: true,
              winner: 'imposter',
              message: `${eliminatedName} was the last civilian. Imposter wins!` 
            };
          } else {
            outcome = {
              type: 'eliminated',
              eliminatedId,
              eliminatedName,
              gameOver: false,
              message: `${eliminatedName} has been voted out. Game continues.` 
            };
          }
        }
      }
    }

    // Resolve forced meeting tie BEFORE saving room state
    if (outcome.type === 'tie' && isForcedMeeting) {
      const isLastRound = room.currentRound >= room.totalRounds;
      outcome = {
        type: 'tie',
        gameOver: isLastRound,           // correctly true on last round
        winner: isLastRound ? 'imposter' : undefined,
        message: isLastRound
          ? 'Final round complete. Imposter was never found. Imposter wins!'
          : "It's a tie. The game continues."
      };
    }

    // Now save room state AFTER outcome is fully resolved
    room.gameState = outcome.gameOver ? 'ended' : 'in-game';
    room.activeMeeting = false;
    room.meetingCaller = null;
    room.currentMeetingVotes = {};
    await RoomManager.saveRoom(roomCode, room);

    // Broadcast result
    io.to(roomCode).emit('meeting_result', {
      outcome,
      lockedPlayers: room.lockedPlayers,
      imposterId: outcome.gameOver ? room.imposterId : null,
      meetingsLeft: room.meetingsLeft,
      eliminatedPlayerRole: outcome.type === 'eliminated'
        ? (room.players.find(p => p.id === outcome.eliminatedId)?.role || null)
        : null,
      remainingCivilians: room.players.filter(p => p.role === 'civilian' && !room.lockedPlayers.includes(p.id)).length,
      eliminatedPlayerName: outcome.type === 'eliminated' ? (outcome.eliminatedName || null) : null,
      isForced: isForcedMeeting,
      nextRound: isForcedMeeting && !outcome.gameOver ? room.currentRound + 1 : room.currentRound,
      timeLeft: isForcedMeeting ? 60 : room.roundTimeLeft
    });

    if (outcome.gameOver) {
      io.to(roomCode).emit('game_over', {
        winner: outcome.winner,
        imposterId: room.imposterId,
        message: outcome.message
      });
    }

    if (!outcome.gameOver) {
      const roundManager = require('./roundManager');
      if (isForcedMeeting) {
        console.log(`📋 Forced meeting ended, calling handleRoundEnd`);
        await roundManager.handleRoundEnd(roomCode, outcome, io);
      } else {
        console.log(`📋 Manual meeting ended, checking if forced meeting pending...`);
        if (room.forcedMeetingPending) {
          room.forcedMeetingPending = false;
          room.activeMeeting = false;
          room.meetingCaller = null;
          room.currentMeetingVotes = {};
          await RoomManager.saveRoom(roomCode, room);
          console.log(`⏰ Forcing delayed meeting trigger`);
          setTimeout(async () => {
            await roundManager.triggerForcedMeeting(roomCode, io);
          }, 2000);
        } else {
          console.log(`▶️ Resuming normal round timer`);
          await roundManager.resumeRound(roomCode, io);
        }
      }
    }

    console.log(`🏁 Meeting resolved in room ${roomCode}: ${outcome.type} - ${outcome.message}`);

  } catch (error) {
    console.error(`❌ Error resolving meeting in room ${roomCode}:`, error);
    throw error;
  }
}

module.exports = {
  initMeeting,
  castMeetingVote,
  resolveMeeting
};
