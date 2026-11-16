# CLAUDE.md

All rules for this repo are in **[AGENTS.md](./AGENTS.md)**, loaded here:

@AGENTS.md

## Claude Code specifics

- **Engine:** every game and quiz is Phaser 4, vendored, started only by `Kit.play.start`. WebGL only, no fallback (`docs/phaser-standard.md`). PixiJS and Canvas2D exist only in old pages that get small fixes.
- **Skills:** game-dev skills are in `.claude/skills/`. Skip the router's engine detection (there is no `package.json`) and use the task skill from the table in `AGENTS.md`. Where a skill disagrees with `AGENTS.md`, `AGENTS.md` wins.
- **Git:** work on `main`, commit and push only when the owner asks. A push to `main` is a production deploy. Commit only your own files; the owner often has uncommitted work.
- **Verify, don't assume:** run the page in the browser pane at 375 x 812, 844 x 390 and 1024 x 768 and read the console before saying a change works. Say what you could not test (for example a real Android phone).
