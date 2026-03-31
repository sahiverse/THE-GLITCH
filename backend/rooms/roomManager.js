const redisClient = require('../config/redis');
const Room = require('./roomState');

class RoomManager {
  static async createRoom(roomData) {
    const { roomName, hostId, maxPlayers } = roomData;
    
    // Generate unique 6-char code
    let code;
    let attempts = 0;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      attempts++;
      if (attempts > 100) {
        throw new Error('Unable to generate unique room code');
      }
    } while (await this.roomExists(code));

    // Create room instance
    const room = new Room({
      code,
      roomName,
      hostId,
      maxPlayers,
      players: []
    });

    // Add host as first player
    const hostPlayer = room.addPlayer({
      id: hostId,
      name: roomData.nickname
    });

    // Store in Redis with 2 hour expiry
    await redisClient.setEx(`room:${code}`, 7200, JSON.stringify(room.toJSON()));

    // Store player -> room mapping for disconnect handling
    await redisClient.setEx(`player:${hostId}`, 7200, code);

    console.log(`🏠 Room created: ${code} by ${roomData.nickname} (${hostId})`);

    return {
      code,
      roomName,
      maxPlayers,
      player: hostPlayer
    };
  }

  static async getRoom(code) {
    const roomData = await redisClient.get(`room:${code}`);
    if (!roomData) {
      return null;
    }
    return Room.fromJSON(JSON.parse(roomData));
  }

  static async saveRoom(roomCode, room) {
    const data = typeof room.toJSON === 'function' 
      ? room.toJSON() 
      : JSON.stringify(room)
    await redisClient.setEx(`room:${roomCode}`, 7200, 
      typeof data === 'string' ? data : JSON.stringify(data))
  }

  static async deleteRoom(code) {
    await redisClient.del(`room:${code}`);
    console.log(`🗑️ Room deleted: ${code}`);
  }

  static async roomExists(code) {
    const exists = await redisClient.exists(`room:${code}`);
    return exists === 1;
  }

  static async joinRoom(code, playerData) {
    const room = await this.getRoom(code);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.isFull()) {
      throw new Error('Room is full');
    }

    // Check if game is in restricted state (after topic voting)
    if (room.isGameRestricted()) {
      throw new Error('Game has already started - no new players can join');
    }

    // Check if player is already in room (creator joining their own room)
    const existingPlayer = room.players.find(p => p.id === playerData.socketId);
    if (existingPlayer) {
      // Player is already in room, just return current room state
      return { room, player: existingPlayer };
    }

    if (!room.isNicknameAvailable(playerData.nickname)) {
      throw new Error('Nickname already taken in this room');
    }

    const player = room.addPlayer({
      id: playerData.socketId,
      name: playerData.nickname
    });

    await this.saveRoom(code, room);

    // Store player -> room mapping
    await redisClient.setEx(`player:${playerData.socketId}`, 7200, code);

    console.log(`👤 Player joined: ${playerData.nickname} (${playerData.socketId}) → room ${code}`);

    return { room, player };
  }

  static async leaveRoom(code, playerId) {
    const room = await this.getRoom(code);
    if (!room) {
      return null;
    }

    const removedPlayer = room.removePlayer(playerId);
    if (!removedPlayer) {
      return null;
    }

    let newHostId = null;
    
    // If no players left, delete room
    if (room.players.length === 0) {
      await this.deleteRoom(code);
    } else {
      // If leaving player was host, promote new host
      if (room.hostId === playerId) {
        newHostId = room.promoteNewHost();
      }
      await this.saveRoom(code, room);
    }

    // Clean up player mapping
    await redisClient.del(`player:${playerId}`);

    console.log(`🚪 Player left: ${removedPlayer.name} (${playerId}) ← room ${code}`);

    return { room, removedPlayer, newHostId };
  }

  static async updatePlayerReady(code, playerId, isReady) {
    const room = await this.getRoom(code);
    if (!room) {
      throw new Error('Room not found');
    }

    const player = room.updatePlayerReady(playerId, isReady);
    if (!player) {
      throw new Error('Player not found');
    }

    await this.saveRoom(code, room);

    return { room, player };
  }

  static async getPlayerRoom(socketId) {
    const roomCode = await redisClient.get(`player:${socketId}`);
    return roomCode;
  }

  static async getRoomInfo(code) {
    const room = await this.getRoom(code);
    if (!room) {
      return { exists: false };
    }

    return {
      exists: true,
      roomName: room.roomName,
      currentPlayers: room.players.length,
      maxPlayers: room.maxPlayers,
      gameState: room.gameState,
      topic: room.topic,
      totalRounds: room.totalRounds,
      currentRound: room.currentRound,
      meetingsLeft: room.meetingsLeft
    };
  }
}

module.exports = RoomManager;
