export const PRESET_TAGS = [
  'Business', 'Economics', 'Psychology', 'Philosophy', 'History',
  'Science', 'Politics', 'Arts', 'Books', 'Movies/TV',
  'Education', 'Strategy', 'Management', 'Startup', 'Finance',
  'Technology', 'AI', 'Data', 'Productivity', 'Career',
  'Health', 'Fitness', 'Mindfulness', 'Food', 'Cooking',
  'Travel', 'Social', 'Family', 'Home', 'Languages',
  'Literature', 'Appointments', 'Ideas', 'Shopping',
  'Music', 'Sports', 'Environment', 'Legal', 'Research', 'Writing',
] as const;

export type PresetTag = typeof PRESET_TAGS[number];
