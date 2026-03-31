const COLOR_POOL = [
  "#00B4D8",  // Blue
  "#F19121",  // Orange
  "#FF6BB5",  // Pink
  "#FFD166",  // Yellow
  "#9B5DE5"   // Purple
];

class Room {
  constructor(data) {
    this.code = data.code;
    this.roomName = data.roomName;
    this.hostId = data.hostId;
    this.maxPlayers = data.maxPlayers;
    this.players = data.players || [];
    this.gameState = data.gameState || 'lobby';
    this.createdAt = data.createdAt || Date.now();
    
    // Phase 2 fields
    this.votes = data.votes || {};
    this.votedPlayers = data.votedPlayers || [];
    this.topic = data.topic || null;
    this.imposterId = data.imposterId || null;
    
    // Phase 3 fields
    this.sharedCode = data.sharedCode || "";
    this.lockedPlayers = data.lockedPlayers || [];
    this.cursors = data.cursors || {};
    
    // Phase 5 fields
    this.meetingCaller = data.meetingCaller || null;
    this.currentMeetingVotes = data.currentMeetingVotes || {};
    this.activeMeeting = data.activeMeeting || false;
    
    // Phase 6 fields (round system)
    this.currentRound = data.currentRound !== undefined ? data.currentRound : 0;
    this.totalRounds = data.totalRounds || 2;
    this.roundTimeLeft = data.roundTimeLeft || 420;
    this.roundTimerActive = data.roundTimerActive !== undefined ? data.roundTimerActive : false;
    this.meetingsLeft = data.meetingsLeft !== undefined ? data.meetingsLeft : 2;
    this.forcedMeetingPending = data.forcedMeetingPending !== undefined ? data.forcedMeetingPending : false;
  }

  // Get next available color
  static getNextAvailableColor(players) {
    const usedColors = players.map(p => p.color);
    return COLOR_POOL.find(color => !usedColors.includes(color));
  }

  // Check if game is in restricted state (after topic voting)
  isGameRestricted() {
    // Restrict joining if game is in 'in-game' state or has been started
    // This prevents new players from joining after topic voting phase
    return this.gameState === 'in-game' || this.gameState === 'meeting' || (this.topic && this.gameState !== 'lobby');
  }

  // Calculate total rounds based on player count
  calculateTotalRounds() {
    return this.players.length <= 4 ? 2 : 3;
  }

  // Calculate max emergency meetings based on player count
  calculateMaxEmergencyMeetings() {
    return this.players.length <= 4 ? 2 : 4;
  }

  // Initialize game settings based on player count
  initializeGameSettings() {
    this.totalRounds = this.calculateTotalRounds();
    this.meetingsLeft = this.calculateMaxEmergencyMeetings();
    // Don't reset currentRound - preserve existing value
    // Don't reset roundTimerActive - preserve existing value
    this.roundTimeLeft = 420;
  }

  // Add player to room
  addPlayer(playerData) {
    const color = Room.getNextAvailableColor(this.players);
    if (!color) {
      throw new Error('No available colors');
    }

    const player = {
      id: playerData.id,
      name: playerData.name,
      color: color,
      isReady: false,
      role: null // Will be set in Phase 2
    };

    this.players.push(player);
    return player;
  }

  // Remove player from room
  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      return this.players.splice(index, 1)[0];
    }
    return null;
  }

  // Update player ready state
  updatePlayerReady(playerId, isReady) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = isReady;
      return player;
    }
    return null;
  }

  // Check if all players are ready
  areAllPlayersReady() {
    return this.players.length > 0 && this.players.every(p => p.isReady);
  }

  // Check if room is full
  isFull() {
    return this.players.length >= this.maxPlayers;
  }

  // Check if nickname is available
  isNicknameAvailable(nickname) {
    return !this.players.some(p => p.name === nickname);
  }

  // Promote new host if current host leaves
  promoteNewHost() {
    if (this.players.length > 0) {
      this.hostId = this.players[0].id;
      return this.hostId;
    }
    return null;
  }

  // Convert to JSON for Redis storage
  toJSON() {
    return {
      code: this.code,
      roomName: this.roomName,
      hostId: this.hostId,
      maxPlayers: this.maxPlayers,
      players: this.players,
      gameState: this.gameState,
      createdAt: this.createdAt,
      
      // Phase 2 fields - CRITICAL for voting persistence
      votes: this.votes,
      votedPlayers: this.votedPlayers,
      topic: this.topic,
      imposterId: this.imposterId,
      
      // Phase 3 fields
      sharedCode: this.sharedCode,
      lockedPlayers: this.lockedPlayers,
      cursors: this.cursors,
      
      // Phase 5 fields
      meetingCaller: this.meetingCaller,
      meetingsLeft: this.meetingsLeft,
      currentMeetingVotes: this.currentMeetingVotes,
      activeMeeting: this.activeMeeting,

      // Phase 6 fields — CRITICAL: must be saved to Redis
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      roundTimeLeft: this.roundTimeLeft,
      roundTimerActive: this.roundTimerActive,
      forcedMeetingPending: this.forcedMeetingPending
    };
  }

  // Create Room instance from JSON
  static fromJSON(data) {
    return new Room(data);
  }
}

module.exports = Room;
