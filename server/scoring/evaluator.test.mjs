import assert from 'node:assert/strict';
import {
  scorePromptRubric,
  normalizeOutput,
  outputsMatch,
  evaluateCodeAgainstTests,
  computeFinalScore
} from './evaluator.mjs';
import { CHALLENGES, getChallengeById, getAllChallenges } from '../challenges/catalog.mjs';

console.log('Running unit tests for scoring and challenge system...');

// 1. Challenge catalog checks
const allPublic = getAllChallenges({ sanitize: true });
assert.ok(allPublic.length >= 10, 'Must seed at least 10 challenges');
for (const c of allPublic) {
  assert.equal(typeof c.title, 'string');
  assert.equal(typeof c.description, 'string');
  assert.ok(['Easy', 'Medium', 'Hard'].includes(c.difficulty));
  assert.ok(['algorithms', 'debugging', 'refactoring', 'SQL', 'API design'].includes(c.category));
  assert.equal(typeof c.starterCode, 'string');
  assert.equal(typeof c.language, 'string');
  assert.ok(Array.isArray(c.visibleExamples));
  assert.equal(c.hiddenTests, undefined, 'Hidden test inputs must never be exposed in sanitized challenges');
}

// 2. Output normalization & matching
assert.equal(normalizeOutput('[0, 1]'), '[0,1]');
assert.equal(normalizeOutput('  hello   world  \n'), 'hello world');
assert.ok(outputsMatch('[0, 1]', '[0,1]'));
assert.ok(outputsMatch('true\n', 'true'));
assert.ok(outputsMatch('True', 'true'));
assert.ok(!outputsMatch('[0, 2]', '[0, 1]'));

// 3. Prompt rubric scoring
const badPrompt = 'solve it';
const badRubric = scorePromptRubric(badPrompt);
assert.ok(badRubric.total <= 15, 'Minimal prompt should score very low on rubric (only base concise points)');

const greatPrompt = 'Write a JavaScript function twoSum(nums, target) that finds two numbers adding to target in O(n) time and O(n) memory. Handle edge cases like empty arrays, null, duplicates, large inputs, and negative numbers. Return the indices as [i, j]. Validate input constraints and explain the hash map steps.';
const greatRubric = scorePromptRubric(greatPrompt);
assert.ok(greatRubric.total >= 80, 'Comprehensive prompt with constraints, edge cases, tests, and structure should score high on rubric');

// 4. Code evaluation against hidden tests
const twoSumChallenge = getChallengeById('two-sum', { sanitize: false });
assert.ok(twoSumChallenge.hiddenTests.length >= 3);

// Working solution
const workingCode = `
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}
`;
const workingEval = await evaluateCodeAgainstTests('javascript', workingCode, twoSumChallenge);
assert.equal(workingEval.passRatio, 1.0, 'Working solution must pass 100% of hidden tests');
assert.equal(workingEval.passedCount, twoSumChallenge.hiddenTests.length);
// Verify no test input was leaked in test summaries
for (const s of workingEval.testSummaries) {
  assert.equal(s.input, undefined);
  assert.equal(s.expectedOutput, undefined);
}

// Broken solution with great prompt (e.g. wrong answer or crashes)
const brokenCode = `
function twoSum(nums, target) {
  // Completely wrong logic
  return [999, 888];
}
`;
const brokenEval = await evaluateCodeAgainstTests('javascript', brokenCode, twoSumChallenge);
assert.equal(brokenEval.passRatio, 0.0, 'Broken solution must pass 0% of hidden tests');
assert.equal(brokenEval.passedCount, 0);

// 5. Final Score Computation (70% tests, 20% prompt rubric, 10% improvement bonus)
// Requirement: "a wrong solution scores low despite a great-sounding prompt"
const brokenScore = computeFinalScore({
  prompt: greatPrompt,
  promptRubric: greatRubric,
  testEval: brokenEval,
  previousBestScore: 0
});
assert.ok(brokenScore.testScore === 0, 'Broken solution must get 0 for tests');
assert.ok(brokenScore.promptScore <= 20, 'Prompt quality max is 20');
assert.ok(brokenScore.total <= 20, `Wrong solution must score low despite great prompt, got ${brokenScore.total}`);

// Working solution with great prompt
const workingScore = computeFinalScore({
  prompt: greatPrompt,
  promptRubric: greatRubric,
  testEval: workingEval,
  previousBestScore: 0
});
assert.equal(workingScore.testScore, 70, 'Passing all tests gives 70/70 points');
assert.ok(workingScore.total >= 85, `Working solution with great prompt should score high (>=85), got ${workingScore.total}`);

// 6. Tie-breaker sorting
// Rule: higher score, then fewer attempts, then earlier submission
const players = [
  { name: 'Alice', points: 80, submissions: 3, firstSubmission: 1000 },
  { name: 'Bob', points: 80, submissions: 1, firstSubmission: 2000 }, // fewer attempts than Alice
  { name: 'Charlie', points: 95, submissions: 4, firstSubmission: 3000 }, // highest score
  { name: 'David', points: 80, submissions: 1, firstSubmission: 1500 } // same attempts as Bob, but earlier submission
];

function sortLeaderboard(list) {
  return [...list].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points; // 1. higher score
    if ((a.submissions || 0) !== (b.submissions || 0)) return (a.submissions || 0) - (b.submissions || 0); // 2. fewer attempts
    return (a.firstSubmission || 0) - (b.firstSubmission || 0); // 3. earlier submission
  });
}

const sorted = sortLeaderboard(players);
assert.equal(sorted[0].name, 'Charlie', 'Charlie has highest score (95)');
assert.equal(sorted[1].name, 'David', 'David has 80 pts, 1 attempt, and earlier time (1500)');
assert.equal(sorted[2].name, 'Bob', 'Bob has 80 pts, 1 attempt, but later time (2000)');
assert.equal(sorted[3].name, 'Alice', 'Alice has 80 pts, but 3 attempts');

console.log('✅ All scoring, challenge, and tie-breaker unit tests passed!');
