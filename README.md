# RPS Arena — Advanced Rock Paper Scissors

A responsive, polished Rock Paper Scissors game built with **HTML, CSS and vanilla JavaScript**. No frameworks, build step, API key, or backend required.

## Features
- Responsive arena UI with dark and light themes
- Rock / Paper / Scissors buttons plus keyboard shortcuts (`1`, `2`, `3`, or `R`, `P`, `S`)
- Computer opponent with random moves and a lightweight adaptive counter strategy
- Win / loss / draw logic, win rate, current and best streaks
- XP and rank progression (Rookie → Contender → Veteran → Elite → Legend)
- Daily-style challenge: win 3 rounds in a row for +50 XP
- Recent match history (last 6 rounds)
- Optional sound effects via Web Audio API
- Stats, preferences and history saved locally in `localStorage`
- Accessible labels, live result announcements, reduced-motion support
- No external runtime dependencies

## Run locally
1. Download or clone this project.
2. Open `index.html` in a modern browser.

Optional: use VS Code's **Live Server** extension for a local server.

## Deploy with GitHub Pages
1. Create a public GitHub repository, e.g. `rps-arena`.
2. Upload `index.html`, `styles.css`, `script.js`, and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select `main` and `/(root)`, then save.
6. Wait for GitHub Pages to publish the site; copy the published URL for submission.

## Rules and scoring
- Rock beats Scissors.
- Scissors beats Paper.
- Paper beats Rock.
- Same choices result in a draw.
- Win: +20 XP. Draw: +5 XP. Loss: +0 XP.
- First 3-win streak completes the challenge and awards +50 bonus XP once per saved profile.

## Interview questions
**How is the winner determined?**  
A dedicated `getOutcome()` function checks for a draw, then tests the three winning combinations. Any other non-draw combination is a loss.

**How is the computer's choice random?**  
`pickComputerMove()` uses `Math.random()` to select from the three possible moves. After a few player choices, it sometimes counters the most frequent recent choice. This is a simple heuristic, not a guaranteed or truly intelligent AI.

**How are ties handled?**  
A tie increments the draw count, resets the active win streak, awards 5 XP, and does not increment wins.

## Project structure
```text
rps-arena/
├── index.html
├── styles.css
├── script.js
└── README.md
```

## Notes
- Progress is stored in the current browser and device; it does not sync between devices.
- Google Fonts are loaded remotely for typography. If unavailable, fallback fonts are used.
- Resetting stats is destructive and requires confirmation.
