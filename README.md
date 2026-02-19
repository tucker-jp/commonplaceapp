# CommonPlace

AI-powered voice memo capture and organization, accessible from any device. Inspired by the commonplace book tradition (Latin: locus communis).

## Features

- Voice recording capture via Web Audio API
- AI transcription with OpenAI Whisper
- Smart analysis: title, summary, cleaned memo, and tags
- Preset tags: LLM selects from a fixed 40-tag vocabulary
- Folder organization: Fragments or Long Notes, with subfolders
- Per-folder AI instructions layered on top of global settings
- Note management: inline edit, move, delete, and batch move
- Library: Books, Movies, Music with completed + recommended lists, decimal ratings, and optional notes
- Creator auto-fill when author/director/artist is left blank
- Recommendations auto-add from notes (watch/read/listen intent) with delete toggle
- AskNotes: chat with your notes using natural language
- Search across titles, summaries, tags, and original text
- Calendar event extraction
- CSV export of notes
- Cross-device access (mobile and desktop)

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 + CSS variables design system |
| Fonts | Fraunces (display), Outfit (body), Manrope (UI) |
| Database | PostgreSQL via Prisma 5 |
| Auth | NextAuth.js (email/password credentials) |
| AI - Analysis | OpenAI GPT-4.1-nano |
| AI - Transcription | OpenAI Whisper |
| Hosting | Vercel (recommended) |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key

### Installation

1) Install dependencies:
```bash
npm install
```

2) Configure environment variables (edit `.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/commonplace"
OPENAI_API_KEY="sk-your-openai-api-key"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

Generate `NEXTAUTH_SECRET` with:
```bash
openssl rand -base64 32
```

3) Set up the database:
```bash
npx prisma migrate dev --name init
```

4) Run the development server:
```bash
npm run dev
```

5) Open http://localhost:3000 and register an account.

## Authentication

CommonPlace uses NextAuth.js with an email/password credentials provider.

- Register: `POST /api/auth/register` (creates account + 4 default folders)
- Login: NextAuth credentials flow returns a session cookie
- Protected routes: app pages require auth; `src/proxy.ts` redirects to `/auth/login`

## Project Structure

```
commonplace/
  src/
    app/
      api/
        analyze/        # Core capture pipeline (LLM + save)
        transcribe/     # Whisper audio to text
        folders/        # GET/POST folders + [folderId] PATCH/DELETE
        notes/          # GET/POST notes + [noteId] PATCH/DELETE
        search/         # Full-text search
        settings/       # User settings (global LLM instructions)
        library/        # Library CRUD
        ask/            # AskNotes chat
        auth/           # NextAuth + register
      auth/             # Login and register pages
      folders/          # Folder list + detail
      library/          # Library page (table view)
      ask/              # AskNotes page
      search/           # Search page
      settings/         # Settings page
    components/         # RecordButton, NoteInput, Navigation, etc.
    lib/                # auth, db, openai, tags, recommendations
    services/           # analysis pipeline, transcription
  prisma/
    schema.prisma       # Database schema
  public/               # Static assets
```

## API Routes

| Route | Methods | Description |
| --- | --- | --- |
| `/api/auth/register` | POST | Register new user (auto-creates default folders) |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth sign in/out/session |
| `/api/transcribe` | POST | Transcribe audio via Whisper |
| `/api/analyze` | POST | Core pipeline: fetch folders and settings, call LLM, save note |
| `/api/folders` | GET, POST | List folders / create folder |
| `/api/folders/[folderId]` | PATCH, DELETE | Update or delete folder |
| `/api/notes` | GET, POST | List notes (supports `?folderId=`) / create note |
| `/api/notes/[noteId]` | PATCH, DELETE | Edit or delete note |
| `/api/search` | GET | Search notes (`?q=` + optional `folderId=`) |
| `/api/export` | GET | Download notes as CSV (`?folderId=` optional) |
| `/api/settings` | GET, PUT | Get or upsert user settings |
| `/api/library` | GET, POST | List library items (`type`, `year`, `recommendations=1|0`) / create item |
| `/api/library/[itemId]` | PATCH, DELETE | Update or delete tracker item |
| `/api/ask` | POST | AskNotes: AI search + answer (`query` + optional `folderId`) |

## Database Schema (High Level)

- User
- Folder (supports subfolders)
- Note (with CalendarEvent)
- LongNote + LongNoteEntry
- Settings
- TrackerItem (Books/Movies/Music, recommendations, status, rating)
- Account, Session, VerificationToken (NextAuth)
- ApiCache

## AI Pipeline

**Capture flow** (`POST /api/analyze`):
1) Server fetches user folders from DB (never trusts client data)
2) Server fetches user settings for global instructions
3) Builds combined instructions (global + per-folder)
4) Single LLM call returns: folder, title, summary, cleanedMemo, tags, action_required, location_relevant, calendar_event
5) Tags filtered to `PRESET_TAGS`
6) Note saved; CalendarEvent created if detected
7) Recommendation extraction runs in the background and surfaces a warning if it fails

**Tag vocabulary** (`src/lib/tags.ts`): 40 fixed tags used by the LLM.

## Deployment

### Vercel (Recommended)

1) Push to GitHub
2) Import project into Vercel
3) Add environment variables
4) Deploy (Prisma migrations run via `postinstall` if configured)

### Database Options

- Supabase
- Vercel Postgres
- Neon
- Railway

## License

MIT
