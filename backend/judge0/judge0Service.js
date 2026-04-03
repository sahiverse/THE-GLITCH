/**
 * Judge0 API Service
 * 
 * Handles submission of code to Judge0 sandbox for execution.
 * Provides language mapping, polling, and test case evaluation.
 * 
 * @module judge0Service
 */

const axios = require('axios');

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';

/**
 * Judge0 language ID mappings
 * @see https://ce.judge0.com/languages
 */
const LANGUAGE_IDS = {
  python: 71,      // Python 3.8
  javascript: 63,  // Node.js 12.14.0
  java: 62,        // OpenJDK 13.0.1
  cpp: 54,         // GCC 9.2.0
  csharp: 51       // Mono 6.6.0.161
};

/**
 * Submit code to Judge0 for execution
 * 
 * @param {string} code - Source code to execute
 * @param {string} language - Programming language key
 * @param {string} stdin - Standard input for the program
 * @param {string} expectedOutput - Expected output for comparison
 * @returns {Promise<string>} Judge0 submission token
 */
async function submitToJudge0(code, language, stdin, expectedOutput) {
  const languageId = LANGUAGE_IDS[language] || 71;

  const response = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
    {
      source_code: code,
      language_id: languageId,
      stdin: stdin || '',
      expected_output: expectedOutput || ''
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    }
  );

  return response.data.token;
}

/**
 * Poll Judge0 submission endpoint until execution completes.
 * 
 * Judge0 status codes:
 * - 1: In Queue
 * - 2: Processing  
 * - 3: Accepted (completed successfully)
 * - 4-14: Various error states (compilation/runtime errors)
 * 
 * @param {string} token - Judge0 submission token
 * @returns {Promise<Object>} Execution result with stdout, stderr, status
 * @throws {Error} If polling exceeds maxAttempts (15 second timeout)
 */
async function pollResult(token) {
  const maxAttempts = 30;      // 30 * 500ms = 15 second timeout
  const delayMs = 500;         // Polling interval

  for (let i = 0; i < maxAttempts; i++) {
    const response = await axios.get(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
      { timeout: 10000 }
    );

    const { status } = response.data;

    // Status 1 = In Queue, 2 = Processing — keep polling
    // Status 3+ = finished (success or error)
    if (status.id > 2) {
      return response.data;
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error('Judge0 timed out waiting for result');
}

/**
 * Execute code against a single test case
 * 
 * @param {string} code - Source code to execute
 * @param {string} language - Programming language
 * @param {Object} testCase - Test case with input and expectedOutput
 * @returns {Promise<Object>} Result with pass/fail status and execution details
 */
async function runSingleTestCase(code, language, testCase) {
  try {
    const token = await submitToJudge0(
      code,
      language,
      testCase.input,
      testCase.expectedOutput
    );

    const result = await pollResult(token);

    const actualOutput = result.stdout?.trim() || '';
    const expectedOutput = testCase.expectedOutput?.trim() || '';
    const passed = result.status.id === 3 &&
                   actualOutput === expectedOutput;

    return {
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: actualOutput,
      stderr: result.stderr || result.compile_output || '',
      status: result.status.description,
      statusId: result.status.id,
      passed: passed,
      time: result.time,
      memory: result.memory
    };
  } catch (error) {
    console.error(`Judge0 error for test case:`, error.message);
    return {
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: '',
      stderr: `Judge0 error: ${error.message}`,
      status: 'Error',
      statusId: 0,
      passed: false,
      time: null,
      memory: null
    };
  }
}

/**
 * Execute code against all test cases sequentially
 * 
 * Note: Sequential execution prevents rate limiting and keeps
 * resource usage predictable on shared Judge0 instances.
 * 
 * @param {string} code - Source code to execute
 * @param {string} language - Programming language
 * @param {Array} testCases - Array of test cases
 * @returns {Promise<Array>} Results for each test case
 */
async function runAllTestCases(code, language, testCases) {
  const results = [];
  for (const tc of testCases) {
    const result = await runSingleTestCase(code, language, tc);
    results.push(result);
  }
  return results;
}

module.exports = {
  runSingleTestCase,
  runAllTestCases,
  LANGUAGE_IDS
};
