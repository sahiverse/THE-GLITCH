const fs = require('fs');
const path = require('path');

// Load all questions from JSON files at startup
// Cached in memory — zero latency during gameplay
const QUESTIONS = {};

const TOPIC_FILE_MAP = {
  'Arrays': 'arrays.json',
  'Strings': 'strings.json',
  'Linked Lists': 'linked-lists.json',
  'Stacks & Queues': 'stacks-queues.json',
  'Binary Search': 'binary-search.json',
  'Recursion': 'recursion.json',
  'Sorting': 'sorting.json',
  'Hashing': 'hashing.json',
  'Trees': 'trees.json',
  'Graphs': 'graphs.json',
  'Dynamic Programming': 'dynamic-programming.json',
  'Sliding Window': 'sliding-window.json'
};

// Load all files into memory on startup
(function loadQuestions() {
  const questionsDir = path.join(__dirname, '../questions');
  let loaded = 0;
  let failed = 0;

  for (const [topic, filename] of Object.entries(TOPIC_FILE_MAP)) {
    try {
      const filePath = path.join(questionsDir, filename);
      const raw = fs.readFileSync(filePath, 'utf8');
      QUESTIONS[topic] = JSON.parse(raw);
      loaded++;
      console.log(`✅ Loaded question: ${topic}`);
    } catch (err) {
      failed++;
      console.error(`❌ Failed to load question file ${filename}:`, err.message);
    }
  }

  console.log(`📚 Questions loaded: ${loaded} success, ${failed} failed`);
})();

function getQuestion(topic) {
  const question = QUESTIONS[topic];
  if (!question) {
    throw new Error(`No question found for topic: ${topic}`);
  }
  return question;
}

function getTopicList() {
  return Object.keys(QUESTIONS);
}

module.exports = { getQuestion, getTopicList };
