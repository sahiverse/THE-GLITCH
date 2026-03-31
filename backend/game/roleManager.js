/**
 * Role Assignment Logic
 * Assigns exactly one imposter and rest civilians
 */

function assignRoles(players) {
  // Validate players array
  if (!Array.isArray(players)) {
    throw new Error('Players must be an array');
  }
  
  if (players.length < 3 || players.length > 5) {
    throw new Error('Players must be between 3 and 5');
  }
  
  // Pick imposter index
  const imposterIndex = Math.floor(Math.random() * players.length);
  
  // Create updated players array with roles
  const updatedPlayers = players.map((player, index) => ({
    ...player,
    role: index === imposterIndex ? 'imposter' : 'civilian'
  }));
  
  // Get imposter ID
  const imposterId = players[imposterIndex].id;
  
  // Console log verification
  const imposters = updatedPlayers.filter(p => p.role === 'imposter');
  const civilians = updatedPlayers.filter(p => p.role === 'civilian');
  
  console.log(`🎭 Role Assignment Verification:`);
  console.log(`   Total players: ${updatedPlayers.length}`);
  console.log(`   Imposters: ${imposters.length} (should be 1)`);
  console.log(`   Civilians: ${civilians.length} (should be ${updatedPlayers.length - 1})`);
  console.log(`   Imposter ID: ${imposterId}`);
  console.log(`   All players:`, updatedPlayers.map(p => ({ name: p.name, role: p.role })));
  
  // Safety check
  if (imposters.length !== 1) {
    throw new Error(`CRITICAL: Expected 1 imposter, got ${imposters.length}`);
  }
  
  return {
    players: updatedPlayers,
    imposterId
  };
}

module.exports = {
  assignRoles
};
