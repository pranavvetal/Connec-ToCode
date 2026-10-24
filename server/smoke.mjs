import assert from 'node:assert/strict';
import { io as clientIo } from 'socket.io-client';

process.env.NODE_ENV = 'test';
const { httpServer, io } = await import('./index.mjs');
await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve));
const address = httpServer.address();
const base = `http://127.0.0.1:${address.port}`;
const sockets = [];
const connect = async () => {
  const socket = clientIo(base, { transports: ['websocket'], timeout: 3000 });
  sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
  return socket;
};
const join = (socket, roomId, name) => new Promise((resolve, reject) => socket.emit('room:join', { roomId, user: { name, color: '#5578d8' } }, result => result.error ? reject(Error(result.error)) : resolve(result)));
try {
  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Connec-ToCode/);
  const mark = await fetch(`${base}/connectocode-mark.svg`);
  assert.equal(mark.status, 200);
  assert.match(await mark.text(), /#7599ee/);
  const health = await fetch(`${base}/api/health`).then(r => r.json());
  assert.equal(health.ok, true);
  const missingRoute = await fetch(`${base}/api/no-such-route`);
  assert.equal(missingRoute.status, 404);
  assert.equal(typeof (await missingRoute.json()).error, 'string');
  const malformedJson = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformedJson.status, 400);
  assert.equal(typeof (await malformedJson.json()).error, 'string');
  const created = await fetch(`${base}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: 'merge-intervals', difficulty: 'Medium', durationSeconds: 600 })
  }).then(async r => ({ status: r.status, body: await r.json() }));
  assert.equal(created.status, 201);
  const roomId = created.body.roomId;
  assert.match(roomId, /^TEAM-[A-Z0-9]{6}$/);
  assert.equal(created.body.challenge.id, 'merge-intervals');
  assert.equal(created.body.durationSeconds, 600);
  assert.equal(created.body.challenge.hiddenTests, undefined, 'Hidden tests must never be leaked to client');
  assert.equal(created.body.challenge.testHarness, undefined, 'Test harness must never be leaked to client');
  const status = await fetch(`${base}/api/room-status/${roomId}`).then(r => r.json());
  assert.equal(status.exists, true);
  const challengesRes = await fetch(`${base}/api/challenges`).then(r => r.json());
  assert.ok(Array.isArray(challengesRes.challenges));
  assert.ok(challengesRes.challenges.length >= 10, 'Should have at least 10 seeded challenges');
  assert.ok(challengesRes.challenges.every(c => c.hiddenTests === undefined), 'Hidden tests must not be exposed in /api/challenges');
  const invalidRun = await fetch(`${base}/api/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'not-a-language', code: 'x' }) });
  assert.equal(invalidRun.status, 400);
  const first = await connect();
  const second = await connect();
  const firstState = await join(first, roomId, 'Jordan');
  assert.equal(firstState.members.length, 1);
  const secondState = await join(second, roomId, 'Maya');
  assert.equal(secondState.members.length, 2);
  const nonHostChange = await new Promise(resolve => second.emit('competition:change-challenge', { challengeId: 'merge-intervals' }, resolve));
  assert.match(nonHostChange.error, /host/);
  const hostChange = await new Promise((resolve, reject) => first.emit('competition:change-challenge', { challengeId: 'merge-intervals' }, ack => ack?.error ? reject(Error(ack.error)) : resolve(ack)));
  assert.equal(hostChange.ok, true);
  assert.equal(hostChange.challenge.id, 'merge-intervals');
  await new Promise(resolve => first.emit('competition:change-challenge', { challengeId: 'two-sum' }, resolve));
  delete process.env.OPENROUTER_API_KEY;
  const deniedStart = await new Promise(resolve => second.emit('competition:start', { durationSeconds: 1 }, resolve));
  assert.match(deniedStart.error, /host/);
  const roundStarted = new Promise(resolve => first.once('competition:state', resolve));
  await new Promise((resolve, reject) => first.emit('competition:start', { durationSeconds: 1 }, ack => ack?.error ? reject(Error(ack.error)) : resolve(ack)));
  assert.ok((await roundStarted).round.endsAt > Date.now());
  const generatedCode = new Promise(resolve => second.once('code:change', resolve));
  const submission = await new Promise((resolve, reject) => first.emit('competition:submit', { language: 'javascript', prompt: 'Write an efficient function for two sum. Handle duplicates and negative values. Explain O(n) time and test empty input.' }, ack => ack?.error ? reject(Error(ack.error)) : resolve(ack)));
  assert.equal(submission.ok, true);
  assert.ok(submission.submission.score.total > 0);
  assert.match(submission.submission.code, /solve/);
  assert.equal((await generatedCode).code, submission.submission.code);
  assert.equal(submission.state.leaderboard[0].name, 'Jordan');
  let finishedRound = null;
  if (submission.state.finished) {
    finishedRound = submission.state;
  } else {
    finishedRound = await new Promise(resolve => {
      const timeout = setTimeout(() => resolve(null), 4000);
      first.on('competition:state', function onState(state) {
        if (state.finished) {
          clearTimeout(timeout);
          first.off('competition:state', onState);
          resolve(state);
        }
      });
    });
  }
  assert.ok(finishedRound?.finished, 'Round must have a finished state');
  assert.equal(finishedRound.finished.winner, 'Jordan');
  const history = await fetch(`${base}/api/competition-history`).then(r => r.json());
  assert.equal(history.rounds[0].winner, 'Jordan');
  const code = 'console.log("in sync")';
  const changed = new Promise(resolve => second.once('code:change', resolve));
  first.emit('code:change', { code, language: 'javascript' });
  assert.equal((await changed).code, code);
  const snapshot = new Promise(resolve => second.once('room:snapshot-added', resolve));
  first.emit('room:snapshot', { code, language: 'javascript' }, ack => assert.equal(ack.ok, true));
  assert.equal((await snapshot).code, code);
  const signal = new Promise(resolve => second.once('voice:signal', resolve));
  first.emit('voice:signal', { to: second.id, signal: { type: 'offer', offer: { type: 'offer', sdp: 'smoke' } } });
  assert.equal((await signal).signal.type, 'offer');
  const chat = new Promise(resolve => second.once('chat:message', resolve));
  first.emit('chat:send', { text: 'Hello from Jordan' }, ack => assert.equal(ack.ok, true));
  assert.equal((await chat).text, 'Hello from Jordan');

  // Verify server-restart durability mid-round
  const durableRoomRes = await fetch(`${base}/api/rooms`, { method: 'POST' }).then(r => r.json());
  const durableRoomId = durableRoomRes.roomId;
  const dSocket = await connect();
  const dJoined = await join(dSocket, durableRoomId, 'DurabilityTester');
  assert.equal(dJoined.roomId, durableRoomId);

  // Start a round with 180 seconds duration
  const dRoundPromise = new Promise(resolve => dSocket.once('competition:state', resolve));
  await new Promise((resolve, reject) => dSocket.emit('competition:start', { durationSeconds: 180 }, ack => ack?.error ? reject(Error(ack.error)) : resolve(ack)));
  const dStartedState = await dRoundPromise;
  assert.ok(dStartedState.round.endsAt > Date.now());

  // Submit a prompt mid-round
  const dSub = await new Promise((resolve, reject) => dSocket.emit('competition:submit', {
    language: 'javascript',
    prompt: 'Write an algorithm for two sum that runs in O(n) time. Test edge cases and duplicates.'
  }, ack => ack?.error ? reject(Error(ack.error)) : resolve(ack)));
  assert.equal(dSub.ok, true);
  assert.ok(dSub.submission.score.total > 0);

  // Allow storage flush
  await new Promise(r => setTimeout(r, 300));

  // Now simulate server restart in a separate fresh Node process
  const { execSync } = await import('node:child_process');
  const verifyScript = `
    import('./server/index.mjs').then(async ({ rooms, io }) => {
      const room = rooms.get('${durableRoomId}');
      if (!room) {
        console.error('Room not found after restart');
        process.exit(1);
      }
      if (!room.round || room.round.endedAt || room.round.endsAt <= Date.now()) {
        console.error('Active round timer lost after restart');
        process.exit(2);
      }
      if (!room.submissions || room.submissions.length === 0) {
        console.error('Submissions lost after restart');
        process.exit(3);
      }
      if (room.submissions[0].author !== 'DurabilityTester') {
        console.error('Submission author mismatch');
        process.exit(4);
      }
      console.log('Durability check passed in fresh process: room, timer, and submissions preserved.');
      await new Promise(r => io.close(r));
      process.exit(0);
    }).catch(err => {
      console.error(err);
      process.exit(5);
    });
  `;
  execSync(`node -e "${verifyScript}"`, { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test' } });

  console.log('Smoke checks passed: page and logo serving, health, room creation/status, invalid-run validation, two-client presence, shared prompt round, generated draft and scoring, live leaderboard/code sync, history endpoint, snapshots, voice signaling relay, chat, and mid-round server restart durability.');
} finally {
  sockets.forEach(socket => socket.disconnect());
  await new Promise(resolve => io.close(resolve));
}


