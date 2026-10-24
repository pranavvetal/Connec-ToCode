import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const historyFile = path.resolve(__dirname, '../data/competition-history.json');

async function importHistory() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set in environment or .env. Please set DATABASE_URL and try again.');
    process.exit(1);
  }

  let rawData;
  try {
    rawData = await fs.readFile(historyFile, 'utf8');
  } catch (err) {
    console.error(`Could not read history file at ${historyFile}:`, err.message);
    process.exit(1);
  }

  let rounds;
  try {
    rounds = JSON.parse(rawData);
    if (!Array.isArray(rounds)) throw new Error('File does not contain a JSON array');
  } catch (err) {
    console.error(`Invalid JSON in history file:`, err.message);
    process.exit(1);
  }

  console.log(`Found ${rounds.length} historical round(s) in ${historyFile}.`);
  const prisma = new PrismaClient({ datasourceUrl: dbUrl });

  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL via Prisma. Starting migration...');

    let importedCount = 0;
    for (const [index, r] of rounds.entries()) {
      const roomId = r.roomId || `HISTORIC-${index + 1}`;
      const challengeTitle = r.challenge || 'Historical Challenge';
      const startedAt = BigInt(r.startedAt || Date.now());
      const endedAt = r.endedAt ? BigInt(r.endedAt) : null;
      const durationSeconds = endedAt && startedAt
        ? Math.max(1, Math.round(Number(endedAt - startedAt) / 1000))
        : 300;

      // Ensure Room exists
      await prisma.room.upsert({
        where: { id: roomId },
        update: { challengeTitle },
        create: {
          id: roomId,
          challengeTitle,
          code: '',
          language: 'javascript'
        }
      });

      // Create Round
      const createdRound = await prisma.round.create({
        data: {
          roomId,
          challengeTitle,
          startedAt,
          endsAt: endedAt || (startedAt + BigInt(300000)),
          endedAt,
          durationSeconds
        }
      });

      // Upsert Users and create Participants
      const participantNames = [...new Set([
        ...(r.participants || []),
        ...(r.features?.map(f => f.name) || [])
      ])].filter(Boolean);

      const userMap = new Map();
      for (const name of participantNames) {
        let user = await prisma.user.findFirst({ where: { name } });
        if (!user) {
          user = await prisma.user.create({ data: { name } });
        }
        userMap.set(name, user.id);

        const feat = r.features?.find(f => f.name === name);
        const playerPoints = feat ? Math.round((feat.values?.[0] || 0) * 100) : (r.winner === name ? (r.points || 0) : 0);
        const bestScore = feat ? Math.round((feat.values?.[1] || 0) * 100) : 0;
        const subCount = feat ? Math.round((feat.values?.[2] || 0) * 5) : 0;
        const improved = feat ? Math.round(feat.values?.[3] || 0) : 0;

        await prisma.participant.create({
          data: {
            roundId: createdRound.id,
            userId: user.id,
            name,
            points: playerPoints,
            bestScore,
            submissions: subCount,
            improved
          }
        });
      }

      // Create Winner if present
      if (r.winner && r.winner !== 'No winner') {
        let winnerUser = userMap.get(r.winner);
        if (!winnerUser) {
          let u = await prisma.user.findFirst({ where: { name: r.winner } });
          if (!u) u = await prisma.user.create({ data: { name: r.winner } });
          winnerUser = u.id;
        }

        await prisma.winner.create({
          data: {
            roundId: createdRound.id,
            userId: winnerUser,
            name: r.winner,
            points: r.points || 0,
            endedAt: endedAt || startedAt
          }
        });
      }

      importedCount++;
    }

    console.log(`✅ Successfully imported ${importedCount} round(s) to PostgreSQL.`);
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importHistory();
