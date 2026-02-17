# CommonPlace

AI-powered voice memo capture and organization - accessible from any device. Inspired by the *commonplace book* (Latin: *locus communis*) — a tradition of great thinkers collecting and organizing ideas in one place.

## Features

- **Voice Recording**: Capture thoughts with your microphone via Web Audio API
- **AI Transcription**: Automatic transcription via OpenAI Whisper
- **Smart Analysis**: AI-powered title, summary, cleaned memo, and tag extraction
- **Preset Tags**: LLM picks from a fixed 40-tag vocabulary — no hallucinated keywords
- **Folder Organization**: Organize notes into folders (Fragments or Long Notes) with subfolder nesting
- **Per-Folder AI Instructions**: Each folder can add custom guidance layered on top of global settings
- **Note Management**: Expand notes in-place to edit title/content/tags, move between folders, or delete
- **Folder Management**: Rename, edit AI instructions, add subfolders, or delete via three-dot menu
- **Search**: Full-text search across titles, summaries, tags, and original text
- **Calendar Events**: Extract and track calendar events from your notes
- **Cross-Device Access**: Works on phone and computer via any browser

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS |
| Database | PostgreSQL via Prisma 5 |
| Auth | NextAuth.js (email/password credentials) |
| AI — Analysis | OpenAI GPT-4.1-nano |
| AI — Transcription | OpenAI Whisper |
| Hosting | Vercel (recommended) |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables — edit `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/commonplace"
OPENAI_API_KEY="sk-your-openai-api-key"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

Generate `NEXTAUTH_SECRET` with: `openssl rand -base64 32`

3. Set up the database:
```bash
npx prisma migrate dev --name init
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) and register an account.

## Authentication

CommonPlace uses NextAuth.js with an email/password credentials provider.

- **Register**: `POST /api/auth/register` — creates account + 4 default folders (Fragments, Ideas, Tasks, Journal)
- **Login**: NextAuth credentials flow — returns session cookie
- **Protected routes**: All app pages require auth; `src/proxy.ts` (Next.js middleware) redirects unauthenticated users to `/auth/login`

## Project Structure

```
commonplace/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── api/
│   │   │   ├── analyze/        # Core capture pipeline (LLM + save)
│   │   │   ├── transcribe/     # Whisper audio → text
│   │   │   ├── folders/        # GET/POST folders + [folderId] PATCH/DELETE
│   │   │   ├── notes/          # GET/POST notes + [noteId] PATCH/DELETE
│   │   │   ├── search/         # Full-text search
│   │   │   ├── settings/       # User settings (global LLM instructions)
│   │   │   └── auth/           # NextAuth + register
│   │   ├── auth/               # Login & register pages
│   │   ├── folders/            # Folders list + [folderId] detail
│   │   ├── search/             # Search page
│   │   └── settings/           # Settings page
│   ├── components/             # React components (RecordButton, NoteInput, ...)
│   ├── lib/
│   │   ├── auth.ts             # NextAuth config + getCurrentUser()
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── openai.ts           # OpenAI client + model/temperature constants
│   │   ├── tags.ts             # PRESET_TAGS — 40 fixed tags for the LLM
│   │   └── password.ts         # bcrypt utilities
│   ├── services/
│   │   ├── analysis.ts         # Single-pass LLM: categorize + analyze
│   │   └── transcription.ts    # Whisper integration
│   ├── hooks/                  # Custom React hooks
│   └── types/                  # TypeScript types
├── prisma/
│   └── schema.prisma           # Database schema
└── public/                     # Static assets
```

## API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/register` | POST | Register new user (auto-creates 4 default folders) |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth sign in/out/session |
| `/api/transcribe` | POST | Transcribe audio via Whisper |
| `/api/analyze` | POST | Core pipeline: fetch folders+settings from DB, call LLM, save note |
| `/api/folders` | GET, POST | List folders / create folder (supports `instructions`, `parentId`) |
| `/api/folders/[folderId]` | PATCH, DELETE | Update (name/instructions/parentId) or delete folder |
| `/api/notes` | GET, POST | List notes (supports `?folderId=`) / create note |
| `/api/notes/[noteId]` | PATCH, DELETE | Edit (title/cleanedMemo/tags/folderId) or delete note |
| `/api/search` | GET | Search notes (`?q=query`) |
| `/api/settings` | GET, PUT | Get/upsert user settings |

## Database Schema

```
User
├── Folder (userId)
│   ├── parentId → Folder (self-relation for subfolder nesting)
│   ├── instructions: String?  (per-folder LLM instructions)
│   ├── Note (folderId)
│   │   └── CalendarEvent (noteId, 1:1)
│   └── LongNote (folderId)
│       └── LongNoteEntry (longNoteId)
└── Settings (userId, 1:1)
    └── customLLMInstructions: String?

Account / Session / VerificationToken  # NextAuth
ApiCache                                # API response caching
```

## AI Pipeline

**Capture flow** (`POST /api/analyze`):
1. Server fetches all user folders from DB (never trusts client-sent folder data)
2. Server fetches user settings for global LLM instructions
3. Builds combined instructions:
   ```
   {globalInstructions}

   FOLDER-SPECIFIC INSTRUCTIONS:
   - Ideas: Focus on novel concepts...
   - Work: ...
   ```
4. Single LLM call (gpt-4.1-nano) returns: `folder`, `title`, `summary`, `cleanedMemo`, `tags`, `action_required`, `location_relevant`, `calendar_event`
5. Tags filtered server-side to `PRESET_TAGS` only (hallucinations stripped)
6. Note saved; `CalendarEvent` created if detected

**Tag vocabulary** (`src/lib/tags.ts`): Business, Economics, Psychology, Philosophy, History, Science, Politics, Arts, Books, Movies/TV, Education, Strategy, Management, Startup, Finance, Technology, AI, Data, Productivity, Career, Health, Fitness, Mindfulness, Food, Cooking, Travel, Social, Family, Home, Languages, Literature, Appointments, Ideas, Shopping, Music, Sports, Environment, Legal, Research, Writing

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy — Prisma migrations run automatically via `postinstall` if configured

### Database Options

- **Supabase**: Free tier, easy setup (current dev DB)
- **Vercel Postgres**: Integrated with Vercel
- **Neon**: Serverless PostgreSQL
- **Railway**: Simple managed PostgreSQL

## License

MIT
