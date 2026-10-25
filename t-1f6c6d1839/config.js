// Supabase project settings (Project Settings -> API keys).
// The anon key is meant to be public: Row Level Security (schema.sql) is what
// keeps the data private. Never put the service_role key here.
window.TRACKER_CONFIG = {
  supabaseUrl: "https://khgigelyofpxmbmlccps.supabase.co",       // e.g. https://abcdefgh.supabase.co
  supabaseAnonKey: "sb_publishable_eMDZ6DJAMG-vm7V1WAa2hg_a1YPkpcR",

  // Plan phases from the Recomp Plan doc.
  phases: [
    { name: "Cut",   start: "2026-10-26", end: "2027-02-14", kcal: 2100, protein: 190, rate: [-1.5, -1.0] },
    { name: "Break", start: "2027-02-15", end: "2027-02-28", kcal: 2650, protein: 190, rate: [-0.5, 0.5] },
    { name: "Bulk",  start: "2027-03-01", end: "2027-12-31", kcal: 2900, protein: 180, rate: [0.25, 0.5] }
  ],
  sessionsPerWeek: 4,
  stepsTarget: 8000,
  lockAfterMinutes: 5
};
