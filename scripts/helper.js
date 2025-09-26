import {
  APP_EMOJI_IDS,
  APP_ANIMATED_EMOJI_IDS,
  HISTORY_SIZE,
  MAX_CONCURRENT_SPINS,
} from "./constants.js";

// =========================
// Emoji helpers
// =========================

// Build an app emoji tag, preferring animated if available.
export function appEmojiTag(name) {
  if (!name) return null;
  const animId = APP_ANIMATED_EMOJI_IDS[name];
  if (animId) return `<a:${name}:${animId}>`;
  const id = APP_EMOJI_IDS[name];
  return id ? `<:${name}:${id}>` : null;
}

// Try to resolve a guild emoji by name.
export function guildEmojiTag(name, guild) {
  if (!name || !guild) return null;
  const found = guild.emojis?.cache?.find?.((e) => e.name === name);
  return found ? found.toString() : null;
}

// Generic resolver: accepts a weapon object or a string key.
// Order: animated app > static app > guild > fallback/placeholder
export function resolveEmoji(target, guild) {
  // String key (e.g., "weapons")
  if (typeof target === "string") {
    return appEmojiTag(target) || guildEmojiTag(target, guild) || "❔";
  }

  // Weapon object path
  const weapon = target || {};
  const name = weapon.customEmojiName;
  return (
    appEmojiTag(name) ||
    guildEmojiTag(name, guild) ||
    weapon.fallbackEmoji ||
    "❔"
  );
}

// =========================
// Concurrency helpers
// =========================

let activeSpins = 0;
const waiters = [];

export function getActiveSpins() {
  return activeSpins;
}

export function getWaiterCount() {
  return waiters.length;
}

export function acquireSlot() {
  if (activeSpins < MAX_CONCURRENT_SPINS) {
    activeSpins++;
    return Promise.resolve({ queuedMs: 0 });
  }
  const start = Date.now();
  return new Promise((resolve) => {
    const ticket = () => resolve({ queuedMs: Date.now() - start });
    waiters.push(ticket);
  });
}

export function releaseSlot() {
  if (activeSpins > 0) activeSpins--;
  if (waiters.length && activeSpins < MAX_CONCURRENT_SPINS) {
    activeSpins++;
    const next = waiters.shift();
    try {
      next();
    } catch (e) {
      logger.error("Spin waiter error", { error: e });
    }
  }
}

// =========================
// History helpers
// =========================

const userWeaponHistory = new Map(); // Map<userId, Weapon[]>

export function pushHistory(userId, weapon) {
  let arr = userWeaponHistory.get(userId);
  if (!arr) {
    arr = [];
    userWeaponHistory.set(userId, arr);
  }
  arr.unshift(weapon);
  if (arr.length > HISTORY_SIZE) arr.length = HISTORY_SIZE;
}

export function buildHistoryLine(userId, guild) {
  const arr = userWeaponHistory.get(userId);
  if (!arr || !arr.length) return null;
  const slice = arr.slice(0, HISTORY_SIZE);
  const emojis = slice.map((w) => resolveEmoji(w, guild));
  return { count: slice.length, line: emojis.join(" ") };
}

// =========================
// Logger utilities
// =========================

function timestamp() {
  return new Date().toISOString();
}

function serialize(meta) {
  if (meta instanceof Error) {
    return { name: meta.name, message: meta.message, stack: meta.stack };
  }
  if (!meta || typeof meta !== "object") return meta;
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v instanceof Error) {
      out[k] = { name: v.name, message: v.message, stack: v.stack };
    } else if (typeof v === "bigint") {
      out[k] = v.toString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

function write(level, message, meta) {
  const base = `[${timestamp()}] [${level}] ${message}`;
  const loggerFn =
    level === "ERROR"
      ? console.error
      : level === "WARN"
      ? console.warn
      : console.log;
  if (meta !== undefined) {
    loggerFn(base, serialize(meta));
  } else {
    loggerFn(base);
  }
}

export const logger = {
  info: (msg, meta) => write("INFO", msg, meta),
  warn: (msg, meta) => write("WARN", msg, meta),
  error: (msg, meta) => write("ERROR", msg, meta),
  debug: (msg, meta) => {
    if (process.env.DEBUG) write("DEBUG", msg, meta);
  },
};

export function interactionContext(interaction, extra = {}) {
  if (!interaction) return extra;
  return {
    guildId: interaction.guild?.id,
    guildName: interaction.guild?.name,
    userId: interaction.user?.id,
    username: interaction.user?.username,
    displayName:
      interaction.member?.displayName ||
      interaction.user?.displayName ||
      interaction.user?.username,
    command: interaction.commandName,
    ...extra,
  };
}

export function attachGlobalErrorHandlers() {
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Promise Rejection", { reason, promise });
  });
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  });
}
