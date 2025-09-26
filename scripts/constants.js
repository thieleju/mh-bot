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

// Application emoji ID maps
// Add IDs for emojis uploaded to your Discord application (globally usable by the bot)
export const APP_EMOJI_IDS = {
  sns: "1421096608552063006",
  sa: "1421096598112309371",
  lan: "1421096586485829632",
  ig: "1421096571625406576",
  hh: "1421096555259101289",
  hbg: "1421096544077353011",
  ham: "1421096532727562284",
  gs: "1421096520362491964",
  gl: "1421096508262055979",
  db: "1421096492868833401",
  cb: "1421096477568270388",
  bow: "1421096377957744662",
  lbg: "1421106749921955900",
  ls: "1421106637149700136",
};

// Animated application emoji IDs (if any). Use the same keys; values are IDs for animated emojis.
export const APP_ANIMATED_EMOJI_IDS = {
  weapons: "1421113588227117207",
};
