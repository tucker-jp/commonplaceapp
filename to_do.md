# CommonPlace - To Do List

## Features (High Priority)
- [ ] Add image upload functionality
- [ ] Add calendar event display on capture page (show extracted events)

## Features (Medium Priority)
- [ ] Add location tagging (browser geolocation API)
- [ ] Long notes support (append entries to ongoing notes)
- [ ] Auto music cataloging (exploring — not ready for implementation)
  - Goal: automatically capture what you listen to (title, artist, album, play count)
  - Import old YouTube Music history via Google Takeout (messy data, no album names)
  - Auto-capture new listens via Last.fm scrobbling (free, clean data, has API)
  - Schema changes needed: add playCount, lastListenedAt, possibly album to TrackerItem
  - Best path: Last.fm CSV upload first → API integration later → Takeout as optional

## Features (Low Priority)
- [ ] PWA setup (manifest.json, service worker) for mobile install
- [ ] Audio playback component for recorded memos
- [ ] Offline indicator
- [ ] Dark mode toggle

## Bugs
- [ ] None currently known

## Improvements
- [ ] Add loading skeletons for better UX
- [ ] Implement optimistic updates for note creation
- [ ] Add error toast notifications
- [ ] Add rate limiting to API routes
- [ ] Implement proper error boundaries
- [ ] Add Library source-note link and recommendation badge
- [ ] Custom `error.tsx` and `not-found.tsx` pages
- [ ] Pagination on note queries
- [ ] Middleware-based centralized auth
- [ ] NextAuth v5 upgrade

## Tech Debt
- [ ] Add unit tests for services (analysis, transcription)
- [ ] Add E2E tests with Playwright
- [ ] Set up CI/CD pipeline
- [ ] Add API request validation (zod)

---

## Completed
- [x] Complete site aesthetic overhaul (warm palette, typography refresh, CSS variables)
- [x] Mobile-responsive layout (bottom tab bar, responsive padding, header overflow fixes)
- [x] CSV export functionality (`/api/export` + settings page dropdown)
- [x] Keyboard shortcuts (`N` for new folder, `Esc` to close modals)
- [x] Auth with NextAuth credentials and protected routes
- [x] Default folders created on registration
- [x] Folder management: rename, delete, edit AI instructions, subfolders
- [x] Note management: edit fields, move between folders, delete, batch move
- [x] Search API + search page with folder scoping and AI assist
- [x] AskNotes page + `/api/ask` AI chat over notes
- [x] Library tracker (`/library`) + `/api/library` CRUD for books, movies, music
- [x] Recommendations auto-add from notes with safe error handling
- [x] Library table view below the add form
- [x] Fix build blocker: remove incorrect `db` type cast for `trackerItem` in analyze + library routes
- [x] Fix pre-existing TS errors in `ask/route.ts` and `library/page.tsx`
- [x] Security: add folder ownership check on note move (`notes/[noteId]` PATCH)
- [x] Security: add response headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [x] Security: add input length validation on POST handlers (analyze, notes, folders, library)
- [x] Deployment: add `postinstall` script for Prisma generate on Vercel
- [x] CSV import for Library items (books, movies, music) with duplicate detection
- [x] About link + modal on home page (commonplace book history + page guide)

Last updated: 2026-02-20
