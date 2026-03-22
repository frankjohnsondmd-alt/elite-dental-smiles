# AGENTS.md — Rodney's Task Guide

## Working Directory
You are working ONLY in this repository. Do not read or modify files outside this directory.

## After Every Task
Write TASK_REPORT.md IN THIS DIRECTORY (not anywhere else) with:
- **Requested:** What was asked
- **Done:** Files created/modified (with full paths relative to this repo)
- **Build:** Result of npm run build or equivalent
- **Status:** COMPLETE or INCOMPLETE (with reason if incomplete)

## Code Standards
- TypeScript strict mode
- No console.log in production code
- Run build before committing — do not commit if build fails
- Commit message: "Fix: [what]" or "Add: [what]"

## Git Workflow
1. Make changes
2. Run build to verify
3. git add -A && git commit -m "..." && git push
4. Write TASK_REPORT.md HERE
