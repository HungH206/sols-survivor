# SOLS-Runner

## Overview

SOLS-Runner is a short narrative puzzle game inspired by the June Solstice, the annual astronomical event that marks the longest day of the year in the Northern Hemisphere and the shortest day in the Southern Hemisphere.

Players take on the role of Leo, a young runner who feels trapped in a repetitive and colorless routine. During an evening run, he discovers a mysterious cosmic crystal hidden beneath an old willow tree. The crystal challenges him with a series of puzzles centered around the concepts of light, balance, and seasonal change.

As each challenge is solved, the world gradually regains its color, reflecting Leo's own journey from emotional stagnation toward clarity and hope.

---

## Theme Inspiration

This project was created for the June Solstice Game Jam.

The game explores several ideas connected to the solstice:

* Light and darkness
* Seasonal transitions
* Personal growth and transformation
* Reflection and self-discovery
* Finding balance during periods of uncertainty

Rather than focusing solely on astronomy, SOLS-Runner uses the solstice as a metaphor for change. Just as the Earth moves through cycles of light and darkness, people experience periods of struggle, growth, and renewal.

---

## Gameplay

The game is designed as a lightweight narrative experience with puzzle-solving elements.

### Core Loop

1. Read the story
2. Solve a puzzle
3. Restore light to the world
4. Progress through Leo's journey
5. Reach the final revelation

### Mechanics

* Interactive text-based storytelling
* Solstice-themed puzzles
* Light restoration progression system
* Multiple stages of environmental transformation
* Simple and accessible gameplay

---

## Story

Leo has spent months feeling disconnected from the world around him.

One day, during a run through a forgotten park, he discovers a mysterious crystal pulsing with cosmic energy. The crystal presents a series of challenges based on the natural cycles of the Earth.

With every puzzle solved, color returns to the environment. The gray world slowly transforms into a vibrant landscape filled with life.

At the end of his journey, Leo discovers that the greatest change was not in the world around him—but within himself.

---

## Educational Elements

The game introduces players to several astronomy concepts:

* Solstice
* Equinox
* Seasonal cycles
* Earth's relationship to sunlight

These topics are woven into the gameplay to encourage curiosity while supporting the game's narrative themes.

---

## Gemini Crystal AI Tutor

SOLS-Runner now includes the Gemini Crystal AI Tutor, an in-game learning assistant powered by Gemini 2.5 Flash.

When players solve a puzzle, the Crystal Tutor can generate a short magical explanation that:

* Explains why the correct answer is right
* Clarifies why the other answer choices are incorrect
* Connects the lesson back to light, seasons, balance, or growth

The browser calls the local `/api/crystal` endpoint, and the Node server securely forwards the request to the Gemini API. This keeps the Gemini API key on the server instead of exposing it in the client bundle. If the AI request fails, the game falls back to the built-in lesson text so the puzzle flow remains playable.

Runtime configuration:

* Model: `gemini-2.5-flash`
* API route: `/api/crystal`
* Required environment variable: `GEMINI_API_KEY`
* Local fallback support: built-in puzzle explanations

---

## Development Process

This project was intentionally designed with a small scope to ensure completion within a short game jam timeline.

The primary development goals were:

* Create a complete playable experience
* Focus on storytelling and theme
* Keep mechanics simple and polished
* Deliver a meaningful emotional journey

---

## Google AI Usage

Google AI Studio and Gemini were used throughout the development process to assist with:

* Story brainstorming
* Character development
* Puzzle ideation
* Narrative refinement
* Game design planning
* Scope reduction and iteration
* Gemini Crystal AI Tutor lesson generation

AI acted as a creative collaborator during development, helping transform an initial concept into a focused and achievable game jam project.

---

## Local Development

The playable app lives in the `sols-survivor` directory.

```bash
cd sols-survivor
npm install
```

Create a local `.env` file with your Gemini API key:

```bash
GEMINI_API_KEY=your_api_key_here
```

Start the local development server:

```bash
npm run dev
```

Build and run the production server locally:

```bash
npm run build
npm start
```

The production server serves the built Vite app, exposes `/api/crystal` for Gemini Crystal Tutor requests, and provides `/healthz` for deployment health checks.

---

## Deployment: Google Cloud Run

The app is ready for Google Cloud Run deployment. The root `package.json` forwards Cloud Buildpack commands into the `sols-survivor` app directory, where the Vite/React game is built and `server.mjs` starts on the Cloud Run-provided `PORT`.

Deploy from the repository root:

```bash
gcloud run deploy sols-runner \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

Cloud Run deployment notes:

* `PORT` is provided automatically by Cloud Run.
* `GEMINI_API_KEY` should be configured from Secret Manager with `--set-secrets`.
* `/healthz` returns `ok` and can be used as a health check endpoint.
* Static game assets are served from `sols-survivor/dist` after `npm run build`.
* Gemini requests are handled server-side so the API key is not shipped to the browser.
* If deploying from inside the nested app directory instead, run the same command after `cd sols-survivor`.

---

## Controls

* Mouse Click / Tap
* Keyboard Input (for puzzle answers, if applicable)

---

## Technologies

* Game Engine: Phaser.js
* Frontend: React, Vite
* Programming Language: TypeScript, JavaScript
* Styling: Tailwind CSS
* Runtime Server: Node.js
* AI Tutor: Gemini Crystal AI Tutor using Gemini 2.5 Flash
* AI Assistance: Google AI Studio, Gemini
* Deployment: Google Cloud Run

---

## Message

SOLS-Runner is a reminder that change is a natural part of life.

Just as the Earth moves between seasons and the balance of light shifts throughout the year, people also move through periods of uncertainty, growth, and renewal.

Sometimes the journey forward begins with a single step into the unknown.
