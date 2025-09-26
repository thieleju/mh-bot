import { APP_EMOJI_IDS, APP_ANIMATED_EMOJI_IDS } from "./constants.js";

// Build an app emoji tag, preferring animated if available.
function appEmojiTag(name) {
  if (!name) return null;
  const animId = APP_ANIMATED_EMOJI_IDS[name];
  if (animId) return `<a:${name}:${animId}>`;
  const id = APP_EMOJI_IDS[name];
  return id ? `<:${name}:${id}>` : null;
}

// Try to resolve a guild emoji by name.
function guildEmojiTag(name, guild) {
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

// Back-compat alias for existing callers using resolveWeaponEmoji(weapon, guild)
export function resolveWeaponEmoji(weapon, guild) {
  return resolveEmoji(weapon, guild);
}

// Get an animated application emoji by key (or null)
export function getAnimatedAppEmoji(name) {
  const id = APP_ANIMATED_EMOJI_IDS[name];
  return id ? `<a:${name}:${id}>` : null;
}
