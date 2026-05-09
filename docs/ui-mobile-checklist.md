# BosscheGuessr Mobile UI Checklist

Use this checklist after gameplay or lobby UI changes.

## Mobile Active Round

- Test at 390x844 and 430x932.
- Street View remains visible and fills the play area.
- Full player list is hidden/collapsed during the active round.
- HUD shows round, timer when relevant, zone/mode, and player count without wrapping badly.
- Guess map is reachable and not tiny.
- Submit Guess uses a solid high-contrast fill and is readable when enabled/disabled.
- Expand Map / Collapse Map uses a solid high-contrast fill and toggles text correctly.
- Reset View uses a solid high-contrast fill and is easy to reach.
- Buttons do not sit under the iOS Safari bottom bar; safe-area spacing is respected.

## Mobile Round Result

- Scoreboard/ranking is visible and useful.
- Round distance and score are readable.
- Next Round button is visible for the host.
- Result map shows actual and guessed positions without covering the action buttons.

## Mobile Lobby

- Host lobby join links wrap cleanly.
- Nice `.local` link, IP fallback, and localhost link each have a copy button.
- Player pills clearly show host, ready, disconnected, or removed state.
- Settings controls remain usable without horizontal scrolling.

## Desktop Active Round

- Street View remains the visual priority.
- Player list can appear as a compact side panel without covering Street View controls.
- Guess map and action buttons do not overlap Google controls.

## Reset View

- Start a round, pan/move away, then click Reset View.
- Confirm the original pano, heading, pitch, and zoom return.
- In X-Second View after expiry, Reset View must not reveal Street View.

## Multiplayer Inactivity

- Start a lobby with two browser tabs.
- Start a round and close one tab.
- Remaining player should see a small disconnected status.
- After 120 seconds, the missing player should be removed and should not block results.
- If the host disappears for 120 seconds, host control should transfer to a remaining connected player.
