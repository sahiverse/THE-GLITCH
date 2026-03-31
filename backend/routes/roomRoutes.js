const express = require('express');
const RoomManager = require('../rooms/roomManager');

const router = express.Router();

// POST /room/create
router.post('/create', async (req, res) => {
  try {
    const { roomName, nickname, maxPlayers, socketId } = req.body;

    // Validation
    if (!roomName || !nickname || !maxPlayers || !socketId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (roomName.length > 15) {
      return res.status(400).json({ error: 'Room name must be 15 characters or less' });
    }

    if (nickname.length > 10) {
      return res.status(400).json({ error: 'Nickname must be 10 characters or less' });
    }

    if (maxPlayers < 3 || maxPlayers > 5) {
      return res.status(400).json({ error: 'maxPlayers must be between 3 and 5' });
    }

    const result = await RoomManager.createRoom({
      roomName,
      nickname,
      maxPlayers,
      hostId: socketId
    });

    res.json({
      success: true,
      code: result.code,
      roomName: result.roomName,
      maxPlayers: result.maxPlayers,
      player: result.player
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// GET /room/:code/exists
router.get('/:code/exists', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code || code.length !== 6) {
      return res.json({ exists: false });
    }

    const roomInfo = await RoomManager.getRoomInfo(code);
    res.json(roomInfo);

  } catch (error) {
    console.error('Check room exists error:', error);
    res.status(500).json({ error: 'Failed to check room' });
  }
});

module.exports = router;
