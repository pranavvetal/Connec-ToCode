import Redis from 'ioredis';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheFile = path.resolve(__dirname, '../data/rooms-cache.json');
const ROOM_TTL_SECONDS = 86400; // 24 hours

let redis = null;
let isRedisActive = false;

// In-memory hydrated map of rooms for ultra-fast event handling
const memoryRooms = new Map();

export function getRoomsMap() {
  return memoryRooms;
}

export function isRedisConnected() {
  return isRedisActive;
}

export function serializeRoom(room) {
  return JSON.stringify({
    code: room.code,
    language: room.language,
    version: room.version || 0,
    snapshots: room.snapshots || [],
    members: Array.from(room.members?.values() || []),
    messages: room.messages || [],
    challenge: room.challenge,
    round: room.round,
    submissions: room.submissions || [],
    points: Array.from(room.points?.values() || []),
    finished: room.finished,
    host: room.host,
    savedAt: Date.now()
  });
}

export function deserializeRoom(raw, defaultChallenge, initialCode) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const members = new Map();
  if (Array.isArray(data.members)) {
    for (const m of data.members) {
      if (m?.id) members.set(m.id, m);
    }
  }

  const points = new Map();
  if (Array.isArray(data.points)) {
    for (const p of data.points) {
      if (p?.id) points.set(p.id, p);
    }
  }

  return {
    code: typeof data.code === 'string' ? data.code : initialCode,
    language: data.language || 'javascript',
    version: data.version || 0,
    snapshots: Array.isArray(data.snapshots) ? data.snapshots : [],
    members,
    messages: Array.isArray(data.messages) ? data.messages : [],
    challenge: data.challenge || { ...defaultChallenge },
    round: data.round || null,
    submissions: Array.isArray(data.submissions) ? data.submissions : [],
    points,
    finished: data.finished || null,
    host: data.host || null,
    cleanupTimer: null,
    roundTimer: null
  };
}

let filePersistTimer = null;
async function persistLocalCache() {
  try {
    const serialized = {};
    for (const [id, r] of memoryRooms.entries()) {
      serialized[id] = {
        code: r.code,
        language: r.language,
        version: r.version || 0,
        snapshots: r.snapshots || [],
        members: Array.from(r.members?.values() || []),
        messages: r.messages || [],
        challenge: r.challenge,
        round: r.round,
        submissions: r.submissions || [],
        points: Array.from(r.points?.values() || []),
        finished: r.finished,
        host: r.host,
        savedAt: Date.now()
      };
    }
    await fs.mkdir(path.dirname(cacheFile), { recursive: true });
    const tmp = `${cacheFile}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(serialized, null, 2), 'utf8');
    await fs.rename(tmp, cacheFile);
  } catch (err) {
    console.error('[roomStore] Error writing local room cache:', err.message);
  }
}

function queueLocalPersist() {
  if (isRedisActive) return;
  if (filePersistTimer) clearTimeout(filePersistTimer);
  filePersistTimer = setTimeout(() => {
    filePersistTimer = null;
    persistLocalCache();
  }, 200);
}

export async function saveRoom(roomId, room) {
  if (!roomId || !room) return;
  memoryRooms.set(roomId, room);

  if (isRedisActive && redis) {
    try {
      const data = serializeRoom(room);
      await redis.set(`ctc:room:${roomId}`, data, 'EX', ROOM_TTL_SECONDS);
      await redis.sadd('ctc:active_rooms', roomId);
    } catch (err) {
      console.warn(`[roomStore] Redis save failed for room ${roomId}:`, err.message);
    }
  } else {
    queueLocalPersist();
  }
}

export async function deleteRoom(roomId) {
  if (!roomId) return;
  memoryRooms.delete(roomId);

  if (isRedisActive && redis) {
    try {
      await redis.del(`ctc:room:${roomId}`);
      await redis.srem('ctc:active_rooms', roomId);
    } catch (err) {
      console.warn(`[roomStore] Redis delete failed for room ${roomId}:`, err.message);
    }
  } else {
    queueLocalPersist();
  }
}

export async function initRoomStore({ defaultChallenge, initialCode, onRestoreRound } = {}) {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        connectTimeout: 4000,
        lazyConnect: true
      });

      await redis.connect();
      isRedisActive = true;
      console.info(`[roomStore] Connected to Redis at ${redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***@')}`);

      // Restore active rooms from Redis
      const roomIds = await redis.smembers('ctc:active_rooms');
      let restoredCount = 0;
      for (const id of roomIds) {
        const raw = await redis.get(`ctc:room:${id}`);
        if (raw) {
          try {
            const room = deserializeRoom(raw, defaultChallenge, initialCode);
            memoryRooms.set(id, room);
            restoredCount++;
            if (onRestoreRound && room.round) {
              onRestoreRound(id, room);
            }
          } catch (e) {
            console.warn(`[roomStore] Failed to deserialize room ${id}:`, e.message);
          }
        } else {
          await redis.srem('ctc:active_rooms', id);
        }
      }
      console.info(`[roomStore] Restored ${restoredCount} active room(s) from Redis.`);
      return true;
    } catch (err) {
      console.warn(`[roomStore] Redis connection failed (${err.message}). Using local in-memory/cache fallback.`);
      isRedisActive = false;
      if (redis) {
        redis.disconnect();
        redis = null;
      }
    }
  } else {
    console.info('[roomStore] REDIS_URL not set; using local in-memory store with durable file cache fallback.');
  }

  // Local fallback: load from durable cache file
  try {
    const raw = await fs.readFile(cacheFile, 'utf8');
    const cached = JSON.parse(raw);
    const now = Date.now();
    let restoredCount = 0;

    for (const [id, r] of Object.entries(cached)) {
      // Discard entries older than TTL (24h)
      if (r.savedAt && now - r.savedAt > ROOM_TTL_SECONDS * 1000) continue;
      const room = deserializeRoom(r, defaultChallenge, initialCode);
      memoryRooms.set(id, room);
      restoredCount++;
      if (onRestoreRound && room.round) {
        onRestoreRound(id, room);
      }
    }
    if (restoredCount > 0) {
      console.info(`[roomStore] Restored ${restoredCount} active room(s) from local cache.`);
    }
  } catch {
    // No previous cache or unparseable, start fresh
  }

  return false;
}
