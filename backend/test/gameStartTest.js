/**
 * Test Game Start Logic
 */

console.log('🧪 Testing Game Start Logic...\n');

const Room = require('../rooms/roomState');

// Test 1: Room with 3 players, maxPlayers=3, all ready
console.log('TEST 1: 3 players, maxPlayers=3, all ready');
const room1 = new Room({
  code: 'TEST1',
  roomName: 'Test Room 1',
  hostId: 'host1',
  maxPlayers: 3,
  players: [
    { id: 'p1', name: 'Player 1', color: '#FF4655', isReady: true },
    { id: 'p2', name: 'Player 2', color: '#00B4D8', isReady: true },
    { id: 'p3', name: 'Player 3', color: '#06D6A0', isReady: true }
  ]
});

console.log(`Players: ${room1.players.length}/${room1.maxPlayers}`);
console.log(`Is Full: ${room1.isFull()}`);
console.log(`All Ready: ${room1.areAllPlayersReady()}`);
console.log(`Should Start: ${room1.areAllPlayersReady() && room1.isFull()}`);
console.log('');

// Test 2: Room with 3 players, maxPlayers=5, all ready (should NOT start)
console.log('TEST 2: 3 players, maxPlayers=5, all ready');
const room2 = new Room({
  code: 'TEST2',
  roomName: 'Test Room 2',
  hostId: 'host1',
  maxPlayers: 5,
  players: [
    { id: 'p1', name: 'Player 1', color: '#FF4655', isReady: true },
    { id: 'p2', name: 'Player 2', color: '#00B4D8', isReady: true },
    { id: 'p3', name: 'Player 3', color: '#06D6A0', isReady: true }
  ]
});

console.log(`Players: ${room2.players.length}/${room2.maxPlayers}`);
console.log(`Is Full: ${room2.isFull()}`);
console.log(`All Ready: ${room2.areAllPlayersReady()}`);
console.log(`Should Start: ${room2.areAllPlayersReady() && room2.isFull()}`);
console.log('');

// Test 3: Room with 5 players, maxPlayers=5, all ready (should start)
console.log('TEST 3: 5 players, maxPlayers=5, all ready');
const room3 = new Room({
  code: 'TEST3',
  roomName: 'Test Room 3',
  hostId: 'host1',
  maxPlayers: 5,
  players: [
    { id: 'p1', name: 'Player 1', color: '#FF4655', isReady: true },
    { id: 'p2', name: 'Player 2', color: '#00B4D8', isReady: true },
    { id: 'p3', name: 'Player 3', color: '#06D6A0', isReady: true },
    { id: 'p4', name: 'Player 4', color: '#FFD166', isReady: true },
    { id: 'p5', name: 'Player 5', color: '#EF476F', isReady: true }
  ]
});

console.log(`Players: ${room3.players.length}/${room3.maxPlayers}`);
console.log(`Is Full: ${room3.isFull()}`);
console.log(`All Ready: ${room3.areAllPlayersReady()}`);
console.log(`Should Start: ${room3.areAllPlayersReady() && room3.isFull()}`);
console.log('');

console.log('🎯 DIAGNOSIS:');
console.log('If you have 3 players ready but game is not starting, check:');
console.log('1. What is maxPlayers set to in the room? (should be 3 for 3 players)');
console.log('2. Are all 3 players showing as ready in the UI?');
console.log('3. Check browser console for any socket errors');
console.log('4. Check server logs for ready_update events');
