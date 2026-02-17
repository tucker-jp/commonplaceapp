# CommonPlace - To Do List

## Features (High Priority)
- [x] Complete site aesthetic overhaul — espresso sidebar, parchment background, white cards, warm borders, muted multi-color tags, Inter font
- [ ] Mobile-responsive layout — ensure all pages work well on small screens (nav, capture, folder list, folder detail, search)
- [ ] Add image upload functionality
- [ ] Add calendar event display on capture page (show extracted events)

## Features (Medium Priority)
- [ ] Add location tagging (browser geolocation API)
- [ ] CSV export functionality (wire existing Export button)
- [ ] Long notes support (append entries to ongoing notes)

## Features (Low Priority)
- [ ] PWA setup (manifest.json, service worker) for mobile install
- [ ] Audio playback component for recorded memos
- [ ] Offline indicator
- [ ] Dark mode toggle (currently always uses system preference)
- [ ] Keyboard shortcuts

## Bugs
- [ ] (None currently known)

## Improvements
- [ ] Add loading skeletons for better UX
- [ ] Implement optimistic updates for note creation
- [ ] Add error toast notifications
- [ ] Add rate limiting to API routes
- [ ] Implement proper error boundaries

## Tech Debt
- [ ] Add unit tests for services (analysis, categorization, transcription)
- [ ] Add E2E tests with Playwright
- [ ] Set up CI/CD pipeline
- [ ] Add API request validation (zod)

---

## Completed
- [x] Implement user authentication (NextAuth with email/password) - `src/lib/auth.ts`, `src/proxy.ts`
- [x] Connect RecordButton to `/api/transcribe` endpoint
- [x] Connect NoteInput to `/api/analyze` endpoint
- [x] Replace `temp-user-id` placeholder in all API routes with real session auth
- [x] Add auth check to transcribe and analyze API endpoints
- [x] Create login and register pages at `/auth/login` and `/auth/register`
- [x] Add session provider to root layout
- [x] Add user email + logout button to Navigation
- [x] Auto-create 4 default folders (Fragments, Ideas, Tasks, Journal) on registration
- [x] Wire folders page to real API with working create modal
- [x] Create folder detail page (`/folders/[folderId]`) with note listing
- [x] Implement search API (`/api/search`) and wire to search page
- [x] Implement settings API (`/api/settings`) and wire to settings page
- [x] Upgrade AI models from gpt-4o-mini to gpt-4.1-nano
- [x] Preset tag list (40 tags in `src/lib/tags.ts`) — LLM now constrained to preset list
- [x] Per-folder AI instructions — stored in DB, injected into analyze pipeline at server-side
- [x] Global custom instructions wired into analyze pipeline (fetched from settings in server)
- [x] Folder management: rename, delete, edit AI instructions via three-dot menu (folders page)
- [x] Subfolder support: `parentId` on Folder model, hierarchy display with indentation
- [x] Create folder with instructions + parent folder dropdown
- [x] Note management: expand/edit title+content+tags, move between folders, delete (folder detail page)
- [x] Folder actions on detail page: rename, edit AI instructions, delete
- [x] New API routes: PATCH/DELETE `/api/folders/[folderId]` and `/api/notes/[noteId]`
- [x] Folder detail UX overhaul: click-to-edit (no intermediate expand), all 5 fields (original/title/cleaned/summary/tags), fixed hover state, move spinner, multi-select batch move, tag search links

*Last updated: Session end - February 2026*
