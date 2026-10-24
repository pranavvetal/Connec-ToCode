# Connec-ToCode

**Prompt better. Build smarter.** A team prompt-engineering arena where people refine prompts against the same coding challenge, compare generated code, and compete for points. Built by **Team Alshi Coders**.

## What it does

- Create a room, invite teammates with a shareable link, and start a timed five-minute prompt round.
- Submit successive prompts to generate a shared code draft; revisions and leaderboard changes synchronize live.
- Score prompts against a visible rubric for detail, constraints, tests, structure, and clarity, with an improvement bonus.
- Predict the current leader using a score prior at first; after two completed rounds, fit an online logistic regression model to prior winners and participants.
- Declare the winner when the server timer ends and keep room, participant, score, and winner history in `server/data/competition-history.json`.
- Edit generated code in Monaco with live room synchronization and participant presence.
- Send room chat messages and save/restore code snapshots.
- Compile and run JavaScript, TypeScript, Python, Java, C++, Go, Rust, and C# through Judge0 CE, with standard input, compiler diagnostics, and execution status.
- Enable your microphone while alone; when a teammate joins, voice calling starts automatically. Calls are one-to-one peer-to-peer.
- Show live compile results after you pause editing; Run reuses the exact cached result if the code and input have not changed. Turn off **Live result** to keep runs manual.
- Generate code from prompts and ask the AI assistant through the configured OpenRouter model. Without an API key, prompt submissions produce a language-aware starter scaffold that includes the submitted prompt; this fallback does not generate a complete solution.
- Switch between dark and light editor themes, with a responsive landing page and mobile workspace navigation.

## Technology

React, TypeScript, Vite, Monaco Editor, Socket.IO, Express, WebRTC, Judge0 CE, and OpenRouter.

## Run it locally

Requirements: Node.js 18 or newer and npm.

```bash
npm install
npm run server
```

In a second terminal, from this project folder:

```bash
npm run dev
```

For local development, use one terminal:

```bash
npm run dev:all
```

This starts Vite as middleware inside the API server, so the preview and API use one port with no HTTP proxy between them. It verifies API health, competition history, page serving, and room creation before printing the preview URL. Open that URL after the success message. The launcher chooses an available port starting at `VITE_PORT` (3000 by default). Avoid running `npm run dev` alone; that command needs a separately running API server. Production mode serves the built frontend from the Express server:

```bash
npm run build
npm start
```

## Environment configuration

Set these on the server, never in frontend source:

- `PORT` — server port, defaults to `5002`.
- `VITE_PORT` — preferred local preview port, defaults to `3000`.
- `OPENROUTER_API_KEY` — optional; enables AI code generation and the AI assistant. Keep this secret server-side. Without it, the app uses a starter scaffold for prompt submissions.
- `OPENROUTER_MODEL` — optional model id; defaults to `meta-llama/llama-3.1-70b-instruct`.
- `JUDGE0_URL` — optional Judge0 CE endpoint override; defaults to `https://ce.judge0.com`.
- `JUDGE0_AUTH_TOKEN` — optional server-side token for a protected Judge0 instance.
- `PISTON_URL` — optional self-hosted Piston endpoint override. The public Piston endpoint may reject unapproved requests.
- `ICE_TURN_URL`, `ICE_TURN_USERNAME`, `ICE_TURN_CREDENTIAL` — optional TURN relay settings for voice calls on networks where STUN alone cannot connect peers.
- `CORS_ORIGIN` — optional comma-separated allowed origins for Socket.IO.

AI calls include the user's question and current editor contents and are sent through the server to OpenRouter. Code execution sends the current program and optional standard input to Judge0 CE, which compiles and runs it in a sandbox. When **Live result** is enabled, code is sent to the configured compiler after you pause editing; disable the toggle for manual runs only. These integrations need network access. Microphone access requires HTTPS or localhost and permission from each caller. STUN is configured by default; TURN settings are recommended for reliable calls across restrictive networks.

## Collaboration and data

Live room state (including code, chat, submissions, leaderboard, and the active timer) is held in server memory, so restarting the server clears active rooms. Completed round history is saved locally in `server/data/competition-history.json` and survives restarts. Code, prompt submissions, standings, and participant presence update in real time. Code changes are broadcast as whole-document updates; simultaneous edits to the same lines can overwrite each other. Voice is a one-to-one peer call; configure TURN for networks where direct peer connections are blocked. Prompt points use a transparent heuristic rubric; winner prediction is advisory and is not itself used to decide the winner. The round winner is the top-scoring participant, with best prompt score and earlier submission breaking ties.

This starter is designed for a hackathon demo. Before a public production launch, add durable storage, authentication/access controls, request rate limits, abuse controls, and a TURN service if reliable voice across restrictive networks is required.

## Verify

```bash
npm run test:smoke
npm run build
npx tsc --noEmit
```

The smoke check connects two Socket.IO clients and checks room creation, presence, code synchronization, a timed round, prompt submission and scoring, generated draft sharing, live leaderboard, automatic winner selection, persistent history endpoint, and chat without calling paid or external AI services.

## 2–3 minute demo

1. Create a room and invite a teammate in another browser profile.
2. Start a round and submit a detailed prompt for the shared Two Sum challenge.
3. Refine the prompt with explicit constraints and edge cases; watch the score, code, and rankings update.
4. Show the model forecast and the winner announcement when the timer expires.
5. Review saved winners on the landing dashboard; prompt code generation uses OpenRouter when configured.
6. Continue in the shared editor to run, chat, save snapshots, and start a voice call.

## License

This clean-room implementation is released under the MIT License. Copyright (c) 2026 Team Alshi Coders. See [LICENSE](LICENSE).
