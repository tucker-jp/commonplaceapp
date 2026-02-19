# CommonPlace - Claude Code Guidelines

## Project Overview
CommonPlace is an AI-powered voice memo capture and organization web app built with Next.js, Tailwind CSS, PostgreSQL (Prisma), and OpenAI APIs. It is a web version of the Eureka iOS app for cross-device access. The name is inspired by the commonplace book tradition (Latin: locus communis).

## Tech Stack
- Framework: Next.js 16 (App Router)
- Styling: Tailwind CSS v4 + CSS variables
- Database: PostgreSQL via Prisma 5
- Fonts: Fraunces (display), Outfit (body), Manrope (UI)
- Auth: NextAuth.js (email/password credentials)
- AI: OpenAI GPT-4.1-nano (analysis) + Whisper (transcription)
- Hosting: Vercel (planned)

## Key Files
- `src/app/page.tsx` - Main capture interface (record + type); surfaces recommendation warning
- `src/app/folders/page.tsx` - Folder list with three-dot menu; `N` opens New Folder bubble, `Esc` closes modals
- `src/app/folders/[folderId]/page.tsx` - Folder detail with editable note cards; `Esc` closes modals
- `src/app/library/page.tsx` - Library page (Books/Movies/Music) with completed/recommended lists and sortable table
- `src/app/ask/page.tsx` - AskNotes: AI chat over notes with folder scope selector
- `src/app/search/page.tsx` - Search interface
- `src/app/settings/page.tsx` - Global LLM instructions + user settings
- `src/app/api/analyze/route.ts` - Core pipeline: fetches folders+settings, calls LLM, saves note, auto-adds recommendations
- `src/app/api/library/route.ts` - GET list + POST library items (recommendations and completed)
- `src/app/api/library/[itemId]/route.ts` - PATCH + DELETE tracker items
- `src/app/api/ask/route.ts` - AI chat over notes: semantic search + GPT synthesis
- `src/lib/recommendations.ts` - Recommendation extraction helpers
- `src/services/analysis.ts` - LLM analysis pipeline (categorize + analyze in one call)
- `src/lib/auth.ts` - NextAuth config + getCurrentUser helper
- `src/lib/db.ts` - Prisma client singleton
- `prisma/schema.prisma` - Database schema

## AI Prompts
Prompts in `src/services/analysis.ts` use:
- Model: gpt-4.1-nano, temperature 0.1, JSON response format
- Tags: constrained to `PRESET_TAGS` (40 options in `src/lib/tags.ts`)
- Instructions: global settings + per-folder instructions injected server-side
- Single-pass: categorization + analysis in one call

## Commands
```bash
npm run dev
npm run build
npm run lint
npx prisma studio
npx prisma migrate dev --name <name>
npx prisma generate
```

## Ongoing Protocol

### While working
- After completing each task, mark it done in `to_do.md`
- When you discover new issues or improvements, add them to `to_do.md`
- When you add/remove/rename key files or change architecture, update both `CLAUDE.md` and `README.md`

### Session end checklist
1) Update `to_do.md` (remove completed items, add new ones)
2) Update `README.md` if infrastructure changed
3) Run build:
```bash
npm run build
```

## to_do.md Categories
- Setup
- Features
- Bugs
- Improvements
- Tech Debt

## Code Style
- Use TypeScript strict mode
- Prefer async/await over .then()
- Use Tailwind for styling (no CSS modules)
- API routes return NextResponse.json()
- Error handling with try/catch in all API routes
- Next.js dynamic route params are `Promise<{...}>`; always `await params`

## Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXTAUTH_URL` - Base URL (http://localhost:3000 for dev)
