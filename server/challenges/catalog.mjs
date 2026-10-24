export const CHALLENGES = [
  {
    id: 'two-sum',
    title: 'Solve Two Sum in one pass',
    difficulty: 'Easy',
    category: 'algorithms',
    language: 'javascript',
    durationMs: 300000,
    description: 'Given an integer array and a target, return the indices of two values that add to the target in O(n) time. Handle negative numbers, duplicates, and empty inputs.',
    starterPrompt: 'Write a JavaScript function twoSum(nums, target) that returns the indices of two numbers adding up to target in O(n) time using a Map. Handle negative numbers and empty arrays.',
    starterCode: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const comp = target - nums[i];
    if (map.has(comp)) return [map.get(comp), i];
    map.set(nums[i], i);
  }
  return [];
}`,
    visibleExamples: [
      { input: '[2, 7, 11, 15]\n9', output: '[0, 1]', explanation: 'nums[0] + nums[1] = 2 + 7 = 9' },
      { input: '[3, 2, 4]\n6', output: '[1, 2]', explanation: 'nums[1] + nums[2] = 2 + 4 = 6' }
    ],
    hiddenTests: [
      { input: '[3, 3]\n6', expectedOutput: '[0, 1]' },
      { input: '[-1, -2, -3, -4, -5]\n-8', expectedOutput: '[2, 4]' },
      { input: '[0, 4, 3, 0]\n0', expectedOutput: '[0, 3]' },
      { input: '[1, 5, 9]\n100', expectedOutput: '[]' }
    ],
    testHarness: `
if (typeof twoSum === 'function') {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf8').trim().split('\\n');
  if (raw.length >= 2) {
    const res = twoSum(JSON.parse(raw[0]), JSON.parse(raw[1]));
    console.log(JSON.stringify(res));
  }
}
`
  },
  {
    id: 'valid-palindrome',
    title: 'Valid Palindrome with Transformations',
    difficulty: 'Easy',
    category: 'algorithms',
    language: 'javascript',
    durationMs: 300000,
    description: 'Given a string, determine whether it reads the same backward after normalizing non-alphanumeric characters and casing with O(1) extra space.',
    starterPrompt: 'Write a JavaScript function isPalindrome(s) that checks if a string is a palindrome, ignoring non-alphanumeric characters and casing.',
    starterCode: `function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}`,
    visibleExamples: [
      { input: '"A man, a plan, a canal: Panama"', output: 'true' },
      { input: '"race a car"', output: 'false' }
    ],
    hiddenTests: [
      { input: '" "', expectedOutput: 'true' },
      { input: '"0P"', expectedOutput: 'false' },
      { input: '"ab_a"', expectedOutput: 'true' },
      { input: '"Was it a car or a cat I saw?"', expectedOutput: 'true' }
    ],
    testHarness: `
if (typeof isPalindrome === 'function') {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf8').trim();
  const inputStr = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw;
  console.log(String(Boolean(isPalindrome(inputStr))));
}
`
  },
  {
    id: 'merge-intervals',
    title: 'Merge Overlapping Intervals',
    difficulty: 'Medium',
    category: 'algorithms',
    language: 'javascript',
    durationMs: 300000,
    description: 'Given an array of intervals, merge all overlapping intervals into non-overlapping spans sorted in ascending order.',
    starterPrompt: 'Write a JavaScript function mergeIntervals(intervals) that sorts and merges all overlapping intervals.',
    starterCode: `function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    if (intervals[i][0] <= last[1]) last[1] = Math.max(last[1], intervals[i][1]);
    else merged.push(intervals[i]);
  }
  return merged;
}`,
    visibleExamples: [
      { input: '[[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' }
    ],
    hiddenTests: [
      { input: '[[1,4],[4,5]]', expectedOutput: '[[1,5]]' },
      { input: '[[1,4],[2,3]]', expectedOutput: '[[1,4]]' },
      { input: '[[6,8],[1,9],[2,4]]', expectedOutput: '[[1,9]]' },
      { input: '[]', expectedOutput: '[]' }
    ],
    testHarness: `
if (typeof mergeIntervals === 'function') {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf8').trim();
  console.log(JSON.stringify(mergeIntervals(JSON.parse(raw))));
}
`
  },
  {
    id: 'debug-sum-evens',
    title: 'Fix Sum of Evens Off-by-One and Null Crash',
    difficulty: 'Easy',
    category: 'debugging',
    language: 'javascript',
    durationMs: 300000,
    description: 'Fix a broken sumEvens function that crashes on null or undefined inputs, misses the last element in the array due to an off-by-one loop condition, and fails on negative even numbers.',
    starterPrompt: 'Debug and fix sumEvens(numbers) so it handles null/undefined/empty arrays and sums all positive and negative even numbers correctly.',
    starterCode: `function sumEvens(numbers) {
  if (!Array.isArray(numbers)) return 0;
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (typeof numbers[i] === 'number' && numbers[i] % 2 === 0) total += numbers[i];
  }
  return total;
}`,
    visibleExamples: [
      { input: '[1, 2, 3, 4, 5, 6]', output: '12' }
    ],
    hiddenTests: [
      { input: '[]', expectedOutput: '0' },
      { input: '[-2, -4, 1, 3]', expectedOutput: '-6' },
      { input: '[1, 3, 5, 7]', expectedOutput: '0' },
      { input: '[0, 2, 4, 6, 8, 10]', expectedOutput: '30' }
    ],
    testHarness: `
if (typeof sumEvens === 'function') {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf8').trim();
  console.log(String(sumEvens(JSON.parse(raw))));
}
`
  },
  {
    id: 'debug-async-batch',
    title: 'Fix Async Batch Processor Timeout',
    difficulty: 'Medium',
    category: 'debugging',
    language: 'javascript',
    durationMs: 300000,
    description: 'Fix a concurrency-limited batch mapping function that fails when input has duplicates, hangs on empty arrays, or drops errors without continuing.',
    starterPrompt: 'Write a robust batchMultiply(nums, factor) that doubles numbers in parallel with a fixed batch size of 2 and preserves input order.',
    starterCode: `async function batchMultiply(nums, factor) {
  if (!Array.isArray(nums) || nums.length === 0) return [];
  const results = [];
  for (let i = 0; i < nums.length; i += 2) {
    const batch = nums.slice(i, i + 2);
    const resolved = await Promise.all(batch.map(async n => n * factor));
    results.push(...resolved);
  }
  return results;
}`,
    visibleExamples: [
      { input: '[1, 2, 3, 4]\n2', output: '[2, 4, 6, 8]' }
    ],
    hiddenTests: [
      { input: '[]\n2', expectedOutput: '[]' },
      { input: '[5]\n3', expectedOutput: '[15]' },
      { input: '[-1, 0, 10]\n-2', expectedOutput: '[2, 0, -20]' }
    ],
    testHarness: `
if (typeof batchMultiply === 'function') {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf8').trim().split('\\n');
  const arr = JSON.parse(raw[0]);
  const factor = Number(raw[1] || 1);
  Promise.resolve(batchMultiply(arr, factor)).then(res => console.log(JSON.stringify(res)));
}
`
  },
  {
    id: 'refactor-user-stats',
    title: 'Refactor Nested Callbacks to Clean Pipeline',
    difficulty: 'Easy',
    category: 'refactoring',
    language: 'javascript',
    durationMs: 300000,
    description: 'Refactor complex callback-style calculations into a pure pipeline function getUserStats(data) that computes user count, average score, and maximum score.',
    starterPrompt: 'Write a clean functional JavaScript function getUserStats(data) returning { count, average, max } from an object with a users array.',
    starterCode: `function getUserStats(data) {
  const users = data?.users || [];
  if (!users.length) return { count: 0, average: 0, max: 0 };
  const scores = users.map(u => u.score || 0);
  const count = scores.length;
  const max = Math.max(...scores);
  const average = Math.round(scores.reduce((a, b) => a + b, 0) / count);
  return { count, average, max };
}`,
    visibleExamples: [
      { input: '{"users": [{"score": 10}, {"score": 20}, {"score": 30}]}', output: '{"count":3,"average":20,"max":30}' }
    ],
    hiddenTests: [
      { input: '{"users": []}', expectedOutput: '{"count":0,"average":0,"max":0}' },
      { input: '{"users": [{"score": 50}]}', expectedOutput: '{"count":1,"average":50,"max":50}' },
      { input: '{"users": [{"score": 100}, {"score": 0}]}', expectedOutput: '{"count":2,"average":50,"max":100}' }
    ],
    testHarness: `
if (typeof getUserStats === 'function') {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf8').trim();
  console.log(JSON.stringify(getUserStats(JSON.parse(raw))));
}
`
  },
  {
    id: 'refactor-cart-reducer',
    title: 'Refactor Shopping Cart Actions to Pure Reducer',
    difficulty: 'Medium',
    category: 'refactoring',
    language: 'javascript',
    durationMs: 300000,
    description: 'Refactor imperative cart mutation code into a pure functional reducer cartReducer(actions) that supports ADD, REMOVE, and CLEAR actions and returns { items: string[], total: number }.',
    starterPrompt: 'Write a pure JavaScript function cartReducer(actions) that takes an array of actions and computes final items and total cost.',
    starterCode: `function cartReducer(actions) {
  let items = [];
  let total = 0;
  for (const act of (actions || [])) {
    if (act.type === 'ADD') {
      items.push(act.item);
      total += act.price || 0;
    } else if (act.type === 'REMOVE') {
      const idx = items.indexOf(act.item);
      if (idx !== -1) {
        items.splice(idx, 1);
        total = Math.max(0, total - (act.price || 0));
      }
    } else if (act.type === 'CLEAR') {
      items = [];
      total = 0;
    }
  }
  return { items, total };
}`,
    visibleExamples: [
      { input: '[{"type":"ADD","item":"apple","price":2},{"type":"ADD","item":"banana","price":3}]', output: '{"items":["apple","banana"],"total":5}' }
    ],
    hiddenTests: [
      { input: '[]', expectedOutput: '{"items":[],"total":0}' },
      { input: '[{"type":"ADD","item":"shirt","price":25},{"type":"REMOVE","item":"shirt","price":25}]', expectedOutput: '{"items":[],"total":0}' },
      { input: '[{"type":"ADD","item":"book","price":15},{"type":"CLEAR"}]', expectedOutput: '{"items":[],"total":0}' }
    ],
    testHarness: `
if (typeof cartReducer === 'function') {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf8').trim();
  console.log(JSON.stringify(cartReducer(JSON.parse(raw))));
}
`
  },
  {
    id: 'sql-query-engine',
    title: 'In-Memory SQL SELECT & WHERE Engine',
    difficulty: 'Medium',
    category: 'SQL',
    language: 'javascript',
    durationMs: 300000,
    description: 'Build an in-memory SQL executor executeSelect(query, table) supporting SELECT col1, col2 FROM table WHERE col >= val or col = val.',
    starterPrompt: 'Implement executeSelect(query, table) in JavaScript to parse and run simple SELECT ... WHERE column = value or column >= value queries on an array of objects.',
    starterCode: `function executeSelect(query, table) {
  const match = query.match(/SELECT\\s+(.+?)\\s+FROM\\s+\\w+(?:\\s+WHERE\\s+(.+))?$/i);
  if (!match) return [];
  const cols = match[1].split(',').map(s => s.trim());
  const where = match[2]?.trim();
  let rows = table;
  if (where) {
    const eqMatch = where.match(/(\\w+)\\s*(=|>=|<=|>|<)\\s*['"]?([^'"]+)['"]?/);
    if (eqMatch) {
      const [, col, op, val] = eqMatch;
      const numVal = Number(val);
      const isNum = !isNaN(numVal);
      rows = rows.filter(r => {
        const v = r[col];
        if (op === '=') return String(v) === val;
        if (op === '>=') return isNum && Number(v) >= numVal;
        if (op === '<=') return isNum && Number(v) <= numVal;
        if (op === '>') return isNum && Number(v) > numVal;
        if (op === '<') return isNum && Number(v) < numVal;
        return true;
      });
    }
  }
  return rows.map(r => {
    if (cols.includes('*')) return r;
    const res = {};
    for (const c of cols) if (c in r) res[c] = r[c];
    return res;
  });
}`,
    visibleExamples: [
      { input: 'SELECT name, age FROM users WHERE age >= 21\\n[{"name":"Alice","age":25},{"name":"Bob","age":19}]', output: '[{"name":"Alice","age":25}]' }
    ],
    hiddenTests: [
      { input: 'SELECT name FROM users WHERE role = "admin"\\n[{"name":"Root","role":"admin"},{"name":"Guest","role":"user"}]', expectedOutput: '[{"name":"Root"}]' },
      { input: 'SELECT age FROM users WHERE age > 30\\n[{"name":"Sam","age":28}]', expectedOutput: '[]' },
      { input: 'SELECT name, age FROM users WHERE age = 30\\n[{"name":"Dan","age":30}]', expectedOutput: '[{"name":"Dan","age":30}]' }
    ],
    testHarness: `
if (typeof executeSelect === 'function') {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf8').trim().split('\\n');
  const query = raw[0];
  const table = JSON.parse(raw.slice(1).join('\\n'));
  console.log(JSON.stringify(executeSelect(query, table)));
}
`
  },
  {
    id: 'sql-group-by',
    title: 'SQL Aggregate GROUP BY & SUM Processor',
    difficulty: 'Hard',
    category: 'SQL',
    language: 'javascript',
    durationMs: 300000,
    description: 'Implement executeGroupBy(table, groupCol, sumCol) that groups records by a column, calculates total sum and record count, and returns sorted results.',
    starterPrompt: 'Write a JavaScript function executeGroupBy(table, groupCol, sumCol) that groups records, computes total and count, and sorts alphabetically by groupCol.',
    starterCode: `function executeGroupBy(table, groupCol, sumCol) {
  const groups = new Map();
  for (const row of (table || [])) {
    const key = String(row[groupCol] || '');
    const amt = Number(row[sumCol] || 0);
    if (!groups.has(key)) groups.set(key, { [groupCol]: key, total: 0, count: 0 });
    const g = groups.get(key);
    g.total += amt;
    g.count += 1;
  }
  return Array.from(groups.values()).sort((a, b) => String(a[groupCol]).localeCompare(String(b[groupCol])));
}`,
    visibleExamples: [
      { input: '[{"dept":"Sales","amount":100},{"dept":"Sales","amount":200},{"dept":"Eng","amount":300}]\\ndept\\namount', output: '[{"dept":"Eng","total":300,"count":1},{"dept":"Sales","total":300,"count":2}]' }
    ],
    hiddenTests: [
      { input: '[]\\ndept\\namount', expectedOutput: '[]' },
      { input: '[{"dept":"HR","amount":50}]\\ndept\\namount', expectedOutput: '[{"dept":"HR","total":50,"count":1}]' },
      { input: '[{"team":"B","pts":5},{"team":"A","pts":10},{"team":"B","pts":15}]\\nteam\\npts', expectedOutput: '[{"team":"A","total":10,"count":1},{"team":"B","total":20,"count":2}]' }
    ],
    testHarness: `
if (typeof executeGroupBy === 'function') {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf8').trim().split('\\n');
  const table = JSON.parse(raw[0]);
  const groupCol = raw[1];
  const sumCol = raw[2];
  console.log(JSON.stringify(executeGroupBy(table, groupCol, sumCol)));
}
`
  },
  {
    id: 'api-rate-limiter',
    title: 'Sliding Window Rate Limiter API',
    difficulty: 'Medium',
    category: 'API design',
    language: 'javascript',
    durationMs: 300000,
    description: 'Implement a sliding window rate limiter evaluateRequests(requests, limit, windowMs) that returns an array of booleans indicating if each request was allowed.',
    starterPrompt: 'Write a JavaScript function evaluateRequests(requests, limit, windowMs) where each request is { client, time } and returns an array of booleans.',
    starterCode: `function evaluateRequests(requests, limit, windowMs) {
  const history = new Map();
  const results = [];
  for (const req of (requests || [])) {
    const client = req.client;
    const time = req.time;
    if (!history.has(client)) history.set(client, []);
    const timestamps = history.get(client).filter(t => time - t < windowMs);
    if (timestamps.length < limit) {
      timestamps.push(time);
      history.set(client, timestamps);
      results.push(true);
    } else {
      history.set(client, timestamps);
      results.push(false);
    }
  }
  return results;
}`,
    visibleExamples: [
      { input: '[{"client":"c1","time":1000},{"client":"c1","time":2000},{"client":"c1","time":3000}]\\n2\\n5000', output: '[true, true, false]' }
    ],
    hiddenTests: [
      { input: '[]\\n2\\n5000', expectedOutput: '[]' },
      { input: '[{"client":"c1","time":1000},{"client":"c2","time":1000}]\\n1\\n5000', expectedOutput: '[true, true]' },
      { input: '[{"client":"c1","time":1000},{"client":"c1","time":7000}]\\n1\\n5000', expectedOutput: '[true, true]' }
    ],
    testHarness: `
if (typeof evaluateRequests === 'function') {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf8').trim().split('\\n');
  const requests = JSON.parse(raw[0]);
  const limit = Number(raw[1] || 1);
  const windowMs = Number(raw[2] || 1000);
  console.log(JSON.stringify(evaluateRequests(requests, limit, windowMs)));
}
`
  },
  {
    id: 'api-idempotency',
    title: 'Idempotency Key Middleware API Design',
    difficulty: 'Hard',
    category: 'API design',
    language: 'javascript',
    durationMs: 300000,
    description: 'Design an idempotency handler processIdempotentOps(ops) that tracks idempotency keys and returns ["processed", "cached", ...] for duplicate requests.',
    starterPrompt: 'Write a JavaScript function processIdempotentOps(ops) that takes array of { key, payload } and returns "processed" on first key appearance and "cached" on repeats.',
    starterCode: `function processIdempotentOps(ops) {
  const seen = new Set();
  const results = [];
  for (const op of (ops || [])) {
    if (seen.has(op.key)) {
      results.push('cached');
    } else {
      seen.add(op.key);
      results.push('processed');
    }
  }
  return results;
}`,
    visibleExamples: [
      { input: '[{"key":"k1","payload":"buy"},{"key":"k1","payload":"buy"},{"key":"k2","payload":"buy"}]', output: '["processed", "cached", "processed"]' }
    ],
    hiddenTests: [
      { input: '[]', expectedOutput: '[]' },
      { input: '[{"key":"x"},{"key":"y"},{"key":"z"}]', expectedOutput: '["processed", "processed", "processed"]' },
      { input: '[{"key":"a"},{"key":"a"},{"key":"a"}]', expectedOutput: '["processed", "cached", "cached"]' }
    ],
    testHarness: `
if (typeof processIdempotentOps === 'function') {
  const fs = require('fs');
  const raw = fs.readFileSync(0, 'utf8').trim();
  console.log(JSON.stringify(processIdempotentOps(JSON.parse(raw))));
}
`
  }
];

export function sanitizeChallenge(challenge) {
  if (!challenge) return null;
  const { hiddenTests, testHarness, ...safe } = challenge;
  return safe;
}

export function getAllChallenges({ sanitize = true } = {}) {
  if (sanitize) {
    return CHALLENGES.map(sanitizeChallenge);
  }
  return CHALLENGES;
}

export function getChallengeById(id, { sanitize = false } = {}) {
  const found = CHALLENGES.find(c => c.id === id);
  if (!found) return null;
  return sanitize ? sanitizeChallenge(found) : found;
}
