# sprint — Logan's Sprint Training

Live at https://sprint.ckhill.com

An 8-week, Mon/Wed/Fri sprint-speed program for a 12-year-old soccer player,
designed to be run solo at a field:

- **This Week** — the current week's Mon/Wed/Fri sessions from the 8-week plan
- **Drills** — drill library with written cues and verified YouTube videos
- **Form** — sprint form explained for a kid, with a video self-check list
- **Test Day** — solo phone-video frame-counting timing instructions
- **Log & PBs** — session log (date, type, completed, RPE, notes) and test
  results (10 m, 20 m, 30 m, flying 10 m, broad jump) with personal bests and
  a progress chart

Backend: Cloudflare Pages Functions (`functions/api/[[route]].js`) + D1
(database `sprint`), localStorage cache with sync indicator — same pattern
as pullups.ckhill.com.

Deploys: GitHub Actions → wrangler pages deploy (needs the repo secret
`CLOUDFLARE_API_TOKEN`), or a local wrangler deploy of the repo root.

Built by Muse, October 2026.
