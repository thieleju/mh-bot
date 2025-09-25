// Centralized constants with environment variable overrides for operational tuning.
// All env var names are prefixed with WHEEL_. Falling back to defaults if unset or invalid.

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const SPIN_DURATION_MS = intFromEnv("WHEEL_SPIN_DURATION_MS", 5000); // Total animation time window
// Legacy: kept for backwards compat – not used by new easing schedule but still exported
export const SPIN_UPDATE_INTERVAL_MS = intFromEnv(
  "WHEEL_SPIN_UPDATE_INTERVAL_MS",
  800
);
export const SPIN_STEPS = intFromEnv("WHEEL_SPIN_STEPS", 10); // Total highlight transitions (incl. final)

// Concurrency & rate limiting
export const MAX_CONCURRENT_SPINS = intFromEnv("WHEEL_MAX_CONCURRENT_SPINS", 3);

export const FAST_PATH_THRESHOLD_MS = intFromEnv(
  "WHEEL_FAST_PATH_THRESHOLD_MS",
  2500
);
export const REDUCED_STEPS_WHEN_BUSY = intFromEnv(
  "WHEEL_REDUCED_STEPS_WHEN_BUSY",
  6
); // More aggressive default reduction
export const USER_COOLDOWN_MS = intFromEnv("WHEEL_USER_COOLDOWN_MS", 5000); // Per-user cooldown between spins
export const HISTORY_SIZE = intFromEnv("WHEEL_HISTORY_SIZE", 5); // Number of previous results to show in final embed

// Embed colors (decimal RGB)
export const COLOR_INITIAL = 0xffd700; // Gold
export const COLOR_SPINNING = 0xff6600; // Orange
export const COLOR_SELECTION = 0x00ff00; // Green
export const COLOR_FINAL = 0x00ff00; // Green

export const COMMAND_SPIN_NAME = "spinthewheel";
export const COMMAND_SPIN_DESCRIPTION = "Get a random Monster Hunter weapon!";

export const FOOTER_TEXT = "Good luck on your hunt! (You'll need it)";
