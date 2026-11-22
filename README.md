# B100 — The Rooms

A monochromatic 2D top-down multiplayer cooperative puzzle game for 1–4 connected players. Puzzles currently require **two** players to solve.

## Local development

1. Install Node.js 18 or later.
2. Run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000` in two browser tabs.
5. Create a lobby in one tab and join using its five-character code in the other.

## Online deployment

GitHub hosts the code, but **GitHub Pages cannot run the WebSocket backend**. Deploy this repository to a Node.js-compatible hosting service such as Render:

- New **Web Service** → connect this GitHub repository
- Build command: `npm install`
- Start command: `npm start`
- Share the generated HTTPS URL with friends.

## Controls

WASD or arrow keys to move. The lobby host advances to the next chamber after both pressure plates are occupied. Room codes can be copied from the top right of the game screen.

## Prototype limitations

Five distinct starting room layouts repeat as you progress toward room 100. All five use cooperative pressure plates. Room progress is stored in memory and resets when the server restarts. This is an early prototype; it does not include persistent accounts, mobile touch controls, or a production-ready anti-cheat system.
