// Core types for CommonPlace

export interface Analysis {
  title: string;
  summary: string;
  cleanedMemo: string;
  tags: string[];
  action_required: boolean;
  location_relevant: boolean;
  calendar_event: RawCalendarEvent | null;
}

export interface RawCalendarEvent {
  title: string;
  dateText: string | null;
  timeText: string | null;
  duration: number | null;
  location: string | null;
  notes: string | null;
  isAllDay: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  placeName: string | null;
}

export interface ProcessedNote {
  originalText: string;
  analysis: Analysis;
  category: string;
  location?: LocationData;
  audioUrl?: string;
  imageUrls?: string[];
}

// API Response types
export interface TranscriptionResponse {
  text: string;
}

export interface CategorizationResponse {
  folder: string;
}

export interface AnalysisResponse extends Analysis {}

// Form types
export interface CreateNoteInput {
  text?: string;
  audioFile?: File;
  imageFiles?: File[];
  includeLocation?: boolean;
}

export interface CreateFolderInput {
  name: string;
  type: "FRAGMENTS" | "LONG";
  instructions?: string;
}

export interface UpdateFolderInput {
  name?: string;
  type?: "FRAGMENTS" | "LONG";
  instructions?: string;
}

// Search types
export interface SearchOptions {
  query: string;
  folderId?: string;
  includeTitle?: boolean;
  includeSummary?: boolean;
  includeTags?: boolean;
  includeOriginalText?: boolean;
  includeCleanedMemo?: boolean;
  actionOnly?: boolean;
}

export interface SearchResult {
  id: string;
  title: string | null;
  summary: string | null;
  matchedField: string;
  folderId: string;
  folderName: string;
  createdAt: Date;
}
