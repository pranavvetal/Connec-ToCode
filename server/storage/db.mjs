import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

let prisma = null;
let isDbActive = false;

export function getPrisma() {
  return prisma;
}

export function isDbConnected() {
  return isDbActive;
}

export async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.info('[db] DATABASE_URL not set; using local file/memory history fallback.');
    return false;
  }

  try {
    prisma = new PrismaClient({
      datasourceUrl: dbUrl,
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
    await prisma.$connect();
    isDbActive = true;
    console.info('[db] Connected to PostgreSQL via Prisma.');
    return true;
  } catch (err) {
    console.warn(`[db] PostgreSQL connection failed (${err.message}). Falling back to local file/memory.`);
    isDbActive = false;
    prisma = null;
    return false;
  }
}

export async function saveRoundToDb(roundData) {
  if (!isDbActive || !prisma) return null;

  try {
    const {
      roomId,
      challenge = 'Coding Challenge',
      startedAt = Date.now(),
      endedAt = Date.now(),
      winner = null,
      points = 0,
      participants = [],
      submissions = [],
      features = []
    } = roundData;

    return await prisma.$transaction(async (tx) => {
      // 1. Ensure Room exists in DB
      await tx.room.upsert({
        where: { id: roomId },
        update: { challengeTitle: challenge },
        create: {
          id: roomId,
          challengeTitle: challenge,
          code: '',
          language: 'javascript'
        }
      });

      // 2. Create Round record
      const round = await tx.round.create({
        data: {
          roomId,
          challengeTitle: challenge,
          startedAt: BigInt(startedAt),
          endsAt: BigInt(endedAt || startedAt + 300000),
          endedAt: endedAt ? BigInt(endedAt) : null,
          durationSeconds: Math.max(1, Math.round((endedAt - startedAt) / 1000)) || 300
        }
      });

      // 3. Upsert Users and create Participants
      const participantNames = [...new Set([
        ...participants,
        ...features.map(f => f.name),
        ...submissions.map(s => s.author)
      ])].filter(Boolean);

      const userMap = new Map();
      for (const name of participantNames) {
        let user = await tx.user.findFirst({ where: { name } });
        if (!user) {
          user = await tx.user.create({ data: { name } });
        }
        userMap.set(name, user.id);

        const feat = features.find(f => f.name === name);
        const playerSubs = submissions.filter(s => s.author === name);
        const playerPoints = feat ? Math.round((feat.values?.[0] || 0) * 100) : (winner === name ? points : 0);
        const bestScore = feat ? Math.round((feat.values?.[1] || 0) * 100) : 0;
        const subCount = feat ? Math.round((feat.values?.[2] || 0) * 5) : playerSubs.length;
        const improved = feat ? Math.round(feat.values?.[3] || 0) : 0;

        await tx.participant.create({
          data: {
            roundId: round.id,
            userId: user.id,
            name,
            points: playerPoints,
            bestScore,
            submissions: subCount,
            improved,
            firstSubmission: playerSubs[0]?.createdAt ? BigInt(playerSubs[0].createdAt) : null
          }
        });
      }

      // 4. Record Submissions
      for (const sub of submissions) {
        const userId = sub.author ? userMap.get(sub.author) : null;
        await tx.submission.create({
          data: {
            roundId: round.id,
            userId,
            authorId: sub.authorId || sub.id || 'anonymous',
            author: sub.author || 'Anonymous',
            prompt: sub.prompt || '',
            language: sub.language || 'javascript',
            code: sub.code || '',
            score: typeof sub.score === 'object' ? (sub.score?.total || 0) : Number(sub.score || 0),
            scoreBreakdown: typeof sub.score === 'object' ? sub.score : null,
            points: sub.points || 0,
            improved: Boolean(sub.improved),
            timestamp: BigInt(sub.createdAt || Date.now())
          }
        });
      }

      // 5. Create Winner if declared
      if (winner && winner !== 'No winner') {
        const userId = userMap.get(winner) || null;
        await tx.winner.create({
          data: {
            roundId: round.id,
            userId,
            name: winner,
            points: points || 0,
            endedAt: BigInt(endedAt || Date.now())
          }
        });
      }

      return round;
    });
  } catch (err) {
    console.error('[db] Error saving round to database:', err);
    return null;
  }
}

export async function getCompetitionHistoryFromDb(limit = 100) {
  if (!isDbActive || !prisma) return null;

  try {
    const rounds = await prisma.round.findMany({
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: {
        winner: true,
        participants: true,
        submissions: true
      }
    });

    return rounds.map(r => {
      const winnerName = r.winner?.name || null;
      return {
        roomId: r.roomId,
        challenge: r.challengeTitle,
        startedAt: Number(r.startedAt),
        endedAt: r.endedAt ? Number(r.endedAt) : null,
        winner: winnerName,
        points: r.winner?.points || 0,
        participants: r.participants.map(p => p.name),
        features: r.participants.map(p => ({
          name: p.name,
          values: [
            p.points / 100,
            p.bestScore / 100,
            p.submissions / 5,
            Math.min(1, p.improved),
            1
          ],
          winner: winnerName === p.name
        }))
      };
    });
  } catch (err) {
    console.error('[db] Error fetching competition history from database:', err);
    return null;
  }
}

export async function seedChallengesToDb(challenges) {
  if (!isDbActive || !prisma || !Array.isArray(challenges)) return false;
  try {
    for (const c of challenges) {
      await prisma.challenge.upsert({
        where: { id: c.id },
        update: {
          title: c.title,
          description: c.description,
          difficulty: c.difficulty,
          category: c.category,
          starterCode: c.starterCode || '',
          starterPrompt: c.starterPrompt || '',
          language: c.language || 'javascript',
          durationMs: c.durationMs || 300000,
          visibleExamples: c.visibleExamples || [],
          hiddenTests: c.hiddenTests || []
        },
        create: {
          id: c.id,
          title: c.title,
          description: c.description,
          difficulty: c.difficulty,
          category: c.category,
          starterCode: c.starterCode || '',
          starterPrompt: c.starterPrompt || '',
          language: c.language || 'javascript',
          durationMs: c.durationMs || 300000,
          visibleExamples: c.visibleExamples || [],
          hiddenTests: c.hiddenTests || []
        }
      });
    }
    console.info(`[db] Seeded ${challenges.length} challenge(s) into PostgreSQL.`);
    return true;
  } catch (err) {
    console.error('[db] Error seeding challenges to database:', err.message);
    return false;
  }
}

export async function getChallengesFromDb() {
  if (!isDbActive || !prisma) return null;
  try {
    const list = await prisma.challenge.findMany();
    return list.map(c => ({
      ...c,
      visibleExamples: Array.isArray(c.visibleExamples) ? c.visibleExamples : [],
      hiddenTests: Array.isArray(c.hiddenTests) ? c.hiddenTests : []
    }));
  } catch (err) {
    console.error('[db] Error reading challenges from database:', err.message);
    return null;
  }
}
