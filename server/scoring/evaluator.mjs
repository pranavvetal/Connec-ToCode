import { execFileSync } from 'node:child_process';

/**
 * 20% weight: Evaluates prompt quality using the established rubric.
 * Returns breakdown out of 100.
 */
export function scorePromptRubric(prompt) {
  if (typeof prompt !== 'string') return { total: 0, detail: 0, constraints: 0, tests: 0, structure: 0, concise: 0 };
  const text = prompt.toLowerCase();
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  const detail = Math.min(25, Math.floor(words.length / 3));
  const constraints = Math.min(20, (text.match(/\b(edge case|constraint|memory|time|complexity|efficient|O\(|limit|input|output)\b/g) || []).length * 4);
  const tests = Math.min(20, (text.match(/\b(example|test|empty|null|duplicate|negative|large|boundary)\b/g) || []).length * 5);
  const structure = Math.min(20, (text.match(/\b(steps|algorithm|return|function|language|explain|format|assume|validate)\b/g) || []).length * 4);
  const concise = Math.max(0, 15 - Math.floor(Math.max(0, words.length - 140) / 8));
  const total = Math.min(100, detail + constraints + tests + structure + concise);
  return { total, detail, constraints, tests, structure, concise };
}

/**
 * Compares two output strings, tolerating whitespace and JSON formatting differences.
 */
export function normalizeOutput(str) {
  if (typeof str !== 'string') return '';
  const trimmed = str.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed);
  } catch {
    return trimmed.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
  }
}

export function outputsMatch(actual, expected) {
  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);
  if (normActual === normExpected) return true;
  // Also check boolean loose match (e.g. true vs "true")
  if (normActual.toLowerCase() === normExpected.toLowerCase()) return true;
  return false;
}

/**
 * Safe local Node.js test runner for JavaScript code when offline or testing.
 */
export function runTestLocally(language, codeWithHarness, input, timeoutMs = 4000) {
  if (language === 'javascript' || language === 'typescript') {
    try {
      const stdout = execFileSync('node', ['-e', codeWithHarness], {
        input,
        timeout: timeoutMs,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 1024 * 1024
      });
      return { stdout: stdout.trim(), code: 0 };
    } catch (err) {
      return { stdout: (err.stdout || '').trim(), stderr: (err.stderr || err.message || '').trim(), code: 1 };
    }
  }
  return { stdout: '', stderr: 'Unsupported local language', code: 1 };
}

/**
 * 70% weight: Runs user code against hidden tests through Judge0 or local runner fallback.
 * Critical: NEVER returns hidden test inputs in the result.
 */
export async function evaluateCodeAgainstTests(language, code, challenge, { runnerFn = null } = {}) {
  const hiddenTests = challenge?.hiddenTests;
  if (!Array.isArray(hiddenTests) || hiddenTests.length === 0) {
    return {
      totalTests: 0,
      passedCount: 0,
      failedCount: 0,
      passRatio: 1.0, // If no tests defined, neutral
      testSummaries: []
    };
  }

  const harness = challenge.testHarness || '';
  const fullCode = `${code}\n\n${harness}`;
  let passedCount = 0;
  const testSummaries = [];

  for (let i = 0; i < hiddenTests.length; i++) {
    const test = hiddenTests[i];
    let actualOutput = '';
    let passed = false;

    try {
      if (typeof runnerFn === 'function') {
        try {
          const res = await runnerFn(language, fullCode, test.input);
          actualOutput = res.stdout || res.output || '';
        } catch {
          const res = runTestLocally(language, fullCode, test.input);
          actualOutput = res.stdout || '';
        }
      } else {
        const res = runTestLocally(language, fullCode, test.input);
        actualOutput = res.stdout || '';
      }
      passed = outputsMatch(actualOutput, test.expectedOutput);
    } catch {
      passed = false;
    }

    if (passed) passedCount++;
    // Sanitized test summary — never expose input or expected values!
    testSummaries.push({
      testIndex: i + 1,
      passed
    });
  }

  const totalTests = hiddenTests.length;
  const passRatio = totalTests > 0 ? (passedCount / totalTests) : 0;

  return {
    totalTests,
    passedCount,
    failedCount: totalTests - passedCount,
    passRatio,
    testSummaries
  };
}

/**
 * Combines tests passed (70%), prompt quality (20%), and improvement bonus (10%).
 * Final score max = 100.
 */
export function computeFinalScore({ prompt, promptRubric, testEval, previousBestScore = 0 }) {
  const rubric = promptRubric || scorePromptRubric(prompt);
  const passRatio = testEval?.passRatio ?? 0;

  // 70% from passing hidden tests (max 70)
  const testScore = Math.round(passRatio * 70);

  // 20% from prompt quality rubric (max 20)
  const promptScore = Math.round((rubric.total / 100) * 20);

  const baseScore = testScore + promptScore; // max 90

  // 10% improvement bonus over previous best score (max 10), earned when code produces working output
  const improvementDelta = Math.max(0, baseScore - previousBestScore);
  const improvementBonus = passRatio > 0 ? Math.min(10, improvementDelta) : 0;

  const total = Math.min(100, baseScore + improvementBonus);
  const improved = baseScore > previousBestScore;

  return {
    total,
    testScore,
    promptScore,
    improvementBonus,
    passRatio,
    passedTests: testEval?.passedCount || 0,
    totalTests: testEval?.totalTests || 0,
    improved,
    rubric
  };
}
