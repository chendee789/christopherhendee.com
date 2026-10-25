// Training program used by the Workout tab.
//
// Week numbers count from the first phase start in config.js (Oct 26, 2026).
// Odd weeks use variation A, even weeks use variation B, and every
// `deloadEvery`-th week is a deload (one fewer set, ~10% lighter).
//
// Each exercise slot:
//   a / b   exercise name in variation A / B (same name = no swap that slot)
//   sets    working sets
//   reps    [low, high] rep range (double progression: hit `high` on every set -> add `inc`)
//   inc     lb to add when progressing
//   main    true for the slot that anchors the session (tracked on the strength chart)
//   bw      bodyweight movement: weight = added load (0 = bodyweight)
//   perLeg  reps are per leg
window.TRACKER_PROGRAM = {
  deloadEvery: 6,
  rotation: ["Upper A", "Lower A", "Upper B", "Lower B"],
  sessions: {
    "Upper A": {
      focus: "Strength · chest, back, shoulders",
      exercises: [
        { a: "Bench press",            b: "Bench press",               sets: 4, reps: [5, 7],   inc: 5,  main: true },
        { a: "Barbell row",            b: "Chest-supported T-bar row", sets: 4, reps: [6, 8],   inc: 5 },
        { a: "Standing overhead press",b: "Seated DB shoulder press",  sets: 3, reps: [8, 10],  inc: 5 },
        { a: "Pull-up",                b: "Lat pulldown",              sets: 3, reps: [6, 10],  inc: 5, bwA: true },
        { a: "EZ-bar curl",            b: "Incline DB curl",           sets: 2, reps: [10, 15], inc: 5 },
        { a: "Cable triceps pushdown", b: "EZ-bar skull crusher",      sets: 2, reps: [10, 15], inc: 5 }
      ]
    },
    "Lower A": {
      focus: "Strength · squat pattern, hamstrings",
      exercises: [
        { a: "Back squat",             b: "Back squat",                sets: 4, reps: [5, 7],   inc: 10, main: true },
        { a: "Romanian deadlift",      b: "Romanian deadlift",         sets: 3, reps: [8, 10],  inc: 10 },
        { a: "DB walking lunge",       b: "DB reverse lunge",          sets: 3, reps: [10, 12], inc: 5, perLeg: true },
        { a: "Lying leg curl",         b: "Seated leg curl",           sets: 3, reps: [10, 12], inc: 5 },
        { a: "Standing calf raise",    b: "Seated calf raise",         sets: 3, reps: [12, 15], inc: 10 }
      ]
    },
    "Upper B": {
      focus: "Volume · upper chest, lats, delts, arms",
      exercises: [
        { a: "Incline DB press",       b: "Incline DB press",          sets: 3, reps: [8, 12],  inc: 5,  main: true },
        { a: "Neutral-grip pulldown",  b: "Wide-grip pulldown",        sets: 3, reps: [8, 12],  inc: 5 },
        { a: "Seated cable row",       b: "Single-arm DB row",         sets: 3, reps: [10, 12], inc: 5 },
        { a: "DB lateral raise",       b: "Cable lateral raise",       sets: 3, reps: [12, 20], inc: 5 },
        { a: "Face pull",              b: "Rear-delt fly",             sets: 3, reps: [15, 20], inc: 5 },
        { a: "Hammer curl",            b: "Cable curl",                sets: 2, reps: [12, 15], inc: 5 },
        { a: "Overhead cable triceps extension", b: "DB overhead triceps extension", sets: 2, reps: [12, 15], inc: 5 }
      ]
    },
    "Lower B": {
      focus: "Volume · hinge, quads, core",
      exercises: [
        { a: "Trap-bar deadlift",      b: "Trap-bar deadlift",         sets: 3, reps: [5, 6],   inc: 10, main: true },
        { a: "Leg press",              b: "Hack squat",                sets: 3, reps: [10, 12], inc: 10 },
        { a: "Bulgarian split squat",  b: "Bulgarian split squat",     sets: 3, reps: [8, 10],  inc: 5, perLeg: true },
        { a: "Leg extension",          b: "Leg extension",             sets: 3, reps: [12, 15], inc: 5 },
        { a: "Hanging knee raise",     b: "Cable crunch",              sets: 3, reps: [10, 15], inc: 5, bwA: true }
      ]
    }
  }
};
