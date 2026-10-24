// Supabase project settings (Project Settings -> API).
// The anon key is meant to be public: Row Level Security (schema.sql) is what
// keeps the data private. Never put the service_role key here.
window.TRACKER_CONFIG = {
  supabaseUrl: "PASTE_PROJECT_URL_HERE",       // e.g. https://abcdefgh.supabase.co
  supabaseAnonKey: "PASTE_ANON_PUBLIC_KEY_HERE",

  // Plan phases from the Recomp Plan doc.
  phases: [
    { name: "Cut",   start: "2026-10-26", end: "2027-02-14", kcal: 2100, protein: 190, rate: [-1.5, -1.0] },
    { name: "Break", start: "2027-02-15", end: "2027-02-28", kcal: 2650, protein: 190, rate: [-0.5, 0.5] },
    { name: "Bulk",  start: "2027-03-01", end: "2027-12-31", kcal: 2900, protein: 180, rate: [0.25, 0.5] }
  ],
  sessionsPerWeek: 4,
  stepsTarget: 8000,
  lifts: ["Squat", "Bench", "Deadlift", "RDL", "OHP", "Row"],
  sessions: ["Upper A", "Lower A", "Upper B", "Lower B", "Other"],
  lockAfterMinutes: 5
};
