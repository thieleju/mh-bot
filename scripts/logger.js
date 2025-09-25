import "dotenv/config";

function timestamp() {
  return new Date().toISOString();
}

function serialize(meta) {
  if (meta instanceof Error) {
    return { name: meta.name, message: meta.message, stack: meta.stack };
  }
  if (!meta || typeof meta !== "object") return meta;
  // Shallow clone & gracefully handle errors inside
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
