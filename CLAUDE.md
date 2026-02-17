# CommonPlace - Claude Code Guidelines

## Project Overview
CommonPlace is an AI-powered voice memo capture and organization web app built with Next.js, Tailwind CSS, PostgreSQL (Prisma), and OpenAI APIs. It's a web version of the Eureka iOS app, designed for cross-device access (phone + computer). The name is inspired by the *commonplace book* (Latin: *locus communis*).

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL via Prisma 5
- **Auth**: NextAuth.js (email/password credentials provider)
- **AI**: OpenAI GPT-4.1-nano (analysis) + Whisper (transcription)
- **Hosting**: Vercel (planned)

## Key Files
- `src/app/page.tsx` - Main capture interface (record + type)
- `src/app/folders/page.tsx` - Folder list with three-dot menus, subfolder support
- `src/app/folders/[folderId]/page.tsx` - Folder detail with expandable/editable note cards
- `src/app/search/page.tsx` - Search interface
- `src/app/settings/page.tsx` - Global LLM instructions + user settings
- `src/app/api/analyze/route.ts` - Core pipeline: fetches folders+settings from DB, calls LLM, saves note
- `src/app/api/folders/route.ts` - GET (list) + POST (create) folders
- `src/app/api/folders/[folderId]/route.ts` - PATCH (rename/instructions/parentId) + DELETE folder
- `src/app/api/notes/route.ts` - GET (list/filter) + POST (create) notes
- `src/app/api/notes/[noteId]/route.ts` - PATCH (edit/move) + DELETE note
- `src/app/api/transcribe/route.ts` - Whisper audio transcription
- `src/app/api/search/route.ts` - Full-text note search
- `src/app/api/settings/route.ts` - GET + PUT user settings
- `src/app/api/auth/register/route.ts` - User registration (auto-creates 4 default folders)
- `src/services/analysis.ts` - LLM analysis pipeline (categorize + analyze in one call)
- `src/services/categorization.ts` - Folder routing logic (legacy, may be unused)
- `src/services/transcription.ts` - Whisper integration
- `src/lib/auth.ts` - NextAuth config + getCurrentUser helper
- `src/lib/db.ts` - Prisma client singleton
- `src/lib/openai.ts` - OpenAI client + model/temperature constants
- `src/lib/tags.ts` - PRESET_TAGS: 40 fixed tags the LLM picks from
- `src/lib/password.ts` - bcrypt password hashing utilities
- `src/proxy.ts` - Middleware for route protection (auth guard)
- `prisma/schema.prisma` - Database schema

## AI Prompts
The AI prompts in `src/services/analysis.ts` use:
- **Model**: gpt-4.1-nano, temperature 0.1, JSON response format
- **Tags**: Constrained to `PRESET_TAGS` (40 fixed options from `src/lib/tags.ts`)
- **Instructions**: Combined global (from Settings) + per-folder instructions injected server-side
- **Single-pass**: One LLM call handles categorization + analysis together

## Commands
```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npx prisma studio    # Open Prisma database GUI
npx prisma migrate dev --name <name>  # Create migration
npx prisma generate  # Regenerate Prisma client
```

## Ongoing Protocol (during every session)

### While working:
- **After completing each task**, mark it done in `to_do.md` (move to Completed or remove from active lists)
- **When you discover new issues or improvements**, add them to `to_do.md` immediately — don't wait until the end
- **When you add/remove/rename key files or change architecture**, update both `CLAUDE.md` (Key Files section) and `README.md` (Architecture section)

### Session end checklist (REQUIRED):
1. **Update `to_do.md`**:
   - Remove or check off completed items
   - Add any new issues, improvements, or TODOs discovered
   - Keep priorities current (high/medium/low)
2. **Update `README.md`** if infrastructure changed:
   - API routes, schema, new services, new pages
3. **Run build**:
   ```bash
   npm run build  # Must pass with no errors
   ```

## to_do.md Categories
- **Setup**: Environment and configuration tasks
- **Features**: New functionality to implement
- **Bugs**: Issues that need fixing
- **Improvements**: Optimizations and enhancements
- **Tech Debt**: Code cleanup and refactoring

## Code Style
- Use TypeScript strict mode
- Prefer async/await over .then()
- Use Tailwind for styling (no CSS modules)
- API routes return NextResponse.json()
- Error handling with try/catch in all API routes
- Next.js 15+ dynamic route params are `Promise<{...}>` — always `await params`

## Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `NEXTAUTH_SECRET` - NextAuth secret (for auth)
- `NEXTAUTH_URL` - Base URL (http://localhost:3000 for dev)
