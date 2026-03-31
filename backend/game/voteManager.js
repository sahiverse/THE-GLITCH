/**
 * Vote Tallying Logic
 * Determines winning topic from votes
 */

function determineWinningTopic(votes) {
  console.log(`🗳️ Vote Tally Verification:`);
  console.log(`   Input votes:`, votes);
  
  // Get all vote counts
  const voteCounts = Object.values(votes);
  console.log(`   Vote counts:`, voteCounts);
  
  // Handle edge case: no votes
  if (voteCounts.length === 0 || voteCounts.every(count => count === 0)) {
    const topics = Object.keys(votes);
    if (topics.length === 0) {
      throw new Error('No topics available for voting');
    }
    const randomWinner = topics[Math.floor(Math.random() * topics.length)];
    console.log(`   No votes scenario - random winner: ${randomWinner}`);
    return randomWinner;
  }
  
  // Find max vote count
  const maxVotes = Math.max(...voteCounts);
  console.log(`   Max votes: ${maxVotes}`);
  
  // Find all topics with max votes
  const tiedTopics = Object.keys(votes).filter(topic => votes[topic] === maxVotes);
  console.log(`   Topics with max votes:`, tiedTopics);
  
  // If only one topic has max votes, return it
  if (tiedTopics.length === 1) {
    const winner = tiedTopics[0];
    console.log(`   Clear winner: ${winner}`);
    return winner;
  }
  
  // If multiple topics are tied, pick randomly
  const randomWinner = tiedTopics[Math.floor(Math.random() * tiedTopics.length)];
  console.log(`   Tie scenario - random winner: ${randomWinner}`);
  return randomWinner;
}

module.exports = {
  determineWinningTopic
};
