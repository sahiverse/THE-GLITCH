const RoomManager = require('../rooms/roomManager');

const roomHandlers = (io, socket) => {
  // join_room
  socket.on('join_room', async (data) => {
    try {
      const { code, nickname } = data;

      if (!code || !nickname) {
        socket.emit('room_error', { error: 'Missing room code or nickname' });
        return;
      }

      if (nickname.length > 10) {
        socket.emit('room_error', { error: 'Nickname must be 10 characters or less' });
        return;
      }

      const result = await RoomManager.joinRoom(code, {
        socketId: socket.id,
        nickname
      });

      // Join socket room
      socket.join(code);
      
      console.log(`🔌 Socket ${socket.id} joined room ${code}`);

      // Send room data to joining player
      socket.emit('room_joined', {
        room: {
          code: result.room.code,
          roomName: result.room.roomName,
          maxPlayers: result.room.maxPlayers,
          players: result.room.players
        },
        yourPlayer: result.player
      });

      // Only broadcast to other players if this is a new player joining
      // (not the host re-joining their own room)
      if (!result.room.players.some(p => p.id === socket.id && p.id === result.room.hostId)) {
        // Broadcast to other players
        socket.to(code).emit('player_joined', {
          player: result.player,
          currentPlayers: result.room.players.length,
          maxPlayers: result.room.maxPlayers,
          room: {
            code: result.room.code,
            roomName: result.room.roomName,
            maxPlayers: result.room.maxPlayers,
            players: result.room.players
          }
        });
      }

      console.log(`✅ ${nickname} joined room ${code}`);

    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('room_error', { error: error.message });
    }
  });

  // player_ready
  socket.on('player_ready', async (data) => {
    console.log('👍 player_ready event received:', data);
    try {
      const { code, isReady } = data;

      if (!code) {
        console.log('❌ Missing room code in player_ready');
        socket.emit('room_error', { error: 'Missing room code' });
        return;
      }

      console.log('📋 Updating ready state for socket:', socket.id, 'to:', isReady, 'in room:', code);
      const result = await RoomManager.updatePlayerReady(code, socket.id, isReady);
      console.log('📋 RoomManager.updatePlayerReady result:', result);

      // Broadcast ready update to entire room
      console.log('📡 Broadcasting ready_update to room:', code);
      io.to(code).emit('ready_update', {
        playerId: socket.id,
        isReady: isReady,
        players: result.room.players.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          isReady: p.isReady,
          role: p.role
        }))
      });

      console.log('📡 Broadcast data:', {
        playerId: socket.id,
        isReady: isReady,
        players: result.room.players.map(p => ({name: p.name, isReady: p.isReady}))
      });

      // Check if all players are ready and room is full
      console.log(`🔍 Game Start Check for room ${code}:`);
      console.log(`   Players: ${result.room.players.length}/${result.room.maxPlayers}`);
      console.log(`   Is Full: ${result.room.isFull()}`);
      console.log(`   All Ready: ${result.room.areAllPlayersReady()}`);
      console.log(`   Player States:`, result.room.players.map(p => ({ name: p.name, isReady: p.isReady })));
      
      if (result.room.areAllPlayersReady() && result.room.isFull()) {
        console.log(`🎮 Game starting in room ${code} - all players ready!`);
        
        // Start game after 1 second delay
        setTimeout(async () => {
          try {
            console.log(`🚀 Emitting game_start to room ${code}`);
            io.to(code).emit('game_start', { code });
            
            // Immediately initialize game (role assignment + topic selection)
            console.log(`🎯 Initializing game for room ${code}`);
            const { initGame } = require('../game/gameManager');
            await initGame(code, io);
            console.log(`✅ Game initialization complete for room ${code}`);
          } catch (error) {
            console.error(`❌ CRITICAL ERROR during game initialization for room ${code}:`, error);
            console.error('Stack trace:', error.stack);
            // Try to notify players
            io.to(code).emit('room_error', { 
              error: 'Failed to start game. Please try creating a new room.' 
            });
          }
        }, 1000);
      } else {
        console.log(`⏳ Game NOT starting - waiting for more players or ready states`);
      }

      console.log(`👍 ${socket.id} ready state: ${isReady}`);

    } catch (error) {
      console.error('Player ready error:', error);
      socket.emit('room_error', { error: error.message });
    }
  });

  // leave_room
  socket.on('leave_room', async (data) => {
    console.log('🚪 leave_room event received:', data);
    try {
      const { code } = data;

      if (!code) {
        console.log('❌ Missing room code in leave_room');
        socket.emit('room_error', { error: 'Missing room code' });
        return;
      }

      console.log('📋 Attempting to leave room:', code, 'for socket:', socket.id);
      const result = await RoomManager.leaveRoom(code, socket.id);
      console.log('📋 RoomManager.leaveRoom result:', result);

      if (result) {
        // Leave socket room
        socket.leave(code);

        // If room still exists, broadcast to remaining players
        if (result.room) {
          console.log('📡 Broadcasting player_left to room:', code);
          socket.to(code).emit('player_left', {
            playerId: socket.id,
            newHostId: result.newHostId,
            players: result.room.players,
            room: {
              code: result.room.code,
              roomName: result.room.roomName,
              maxPlayers: result.room.maxPlayers,
              players: result.room.players
            }
          });
        } else {
          console.log('🏢 Room was deleted, no broadcast needed');
        }

        console.log(`👋 Player ${socket.id} left room ${code}`);
      } else {
        console.log('❌ No result from RoomManager.leaveRoom');
      }

    } catch (error) {
      console.error('Leave room error:', error);
      socket.emit('room_error', { error: error.message });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    try {
      const roomCode = await RoomManager.getPlayerRoom(socket.id);
      
      if (roomCode) {
        const result = await RoomManager.leaveRoom(roomCode, socket.id);

        if (result) {
          // If room still exists, broadcast to remaining players
          if (result.room) {
            // Calculate alive players (excluding locked/disconnected players)
            const alivePlayers = result.room.players.filter(player => 
              !result.room.lockedPlayers?.includes(player.id)
            );
            
            io.to(roomCode).emit('player_left', {
              playerId: socket.id,
              newHostId: result.newHostId,
              players: result.room.players,
              aliveCount: alivePlayers.length,
              totalCount: result.room.players.length,
              room: {
                code: result.room.code,
                roomName: result.room.roomName,
                maxPlayers: result.room.maxPlayers,
                players: result.room.players
              }
            });
            
            // Also broadcast alive count update separately for game rooms
            io.to(roomCode).emit('alive_count_update', {
              aliveCount: alivePlayers.length,
              totalCount: result.room.players.length
            });
          }

          console.log(`⚡ Player ${socket.id} disconnected from room ${roomCode}`);
          console.log(`📊 Alive count updated: ${result.room?.players?.filter(p => !result.room.lockedPlayers?.includes(p.id))?.length || 0}/${result.room?.players?.length || 0}`);
        }
      }

    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
};

module.exports = roomHandlers;
