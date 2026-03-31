const axios = require('axios');

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';

// Language ID map — Judge0 language IDs
const LANGUAGE_IDS = {
  python: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
  csharp: 51
};

/**
 * Submit code to Judge0 and get token back
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
 * Poll Judge0 until result is ready
 */
async function pollResult(token) {
  const maxAttempts = 30;
  const delayMs = 500;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await axios.get(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
      { timeout: 10000 }
    );

    const { status } = response.data;

    // Status 1 = In Queue, 2 = Processing — keep polling
    // Status 3+ = finished
    if (status.id > 2) {
      return response.data;
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error('Judge0 timed out waiting for result');
}

/**
 * Run code against a single test case
 * Returns result object with pass/fail and details
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
    console.error(`❌ Judge0 error for test case:`, error.message);
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
 * Run code against all test cases sequentially
 * Returns array of results
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
