# AGENTS.md — Rodney's Task Guide

## After Every Task
Write or update TASK_REPORT.md in this directory with:
- **Requested:** What was asked
- **Done:** Files created/modified (with full paths)
- **Build:** Result of npm run build or equivalent
- **Status:** COMPLETE or INCOMPLETE (with reason if incomplete)

## Code Standards
- TypeScript strict mode
- No console.log in production code
- Run build before committing
- Commit message format: "Fix: [what was fixed]" or "Add: [what was added]"

## Git Workflow
1. Make changes
2. Run build to verify
3. git add -A && git commit -m "..." && git push
4. Write TASK_REPORT.md
