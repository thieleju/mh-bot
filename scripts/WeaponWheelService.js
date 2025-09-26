import { EmbedBuilder } from "discord.js";
import { renderApplicationEmoji } from "./appEmojis.js";
import {
  COLOR_INITIAL,
  COLOR_SPINNING,
  COLOR_SELECTION,
  COLOR_FINAL,
  FOOTER_TEXT,
  HISTORY_SIZE,
} from "./constants.js";

/**
 * Resolves the emoji representation of a weapon, prioritizing custom emojis in the guild.
 * @param {Object} weapon - The weapon object containing emoji info.
 * @param {Object} guild - The guild object to search for custom emojis.
 * @returns {string} - The resolved emoji string.
 */
export function resolveWeaponEmoji(weapon, guild) {
  // Prefer application-owned emoji (globally usable by the app)
  if (weapon.customEmojiName) {
    const appEmoji = renderApplicationEmoji(weapon.customEmojiName);
    if (appEmoji) return appEmoji;
  }
  // Fallback to guild emoji if application emoji is missing
  if (guild && weapon.customEmojiName) {
    const found = guild.emojis.cache.find(
      (e) => e.name === weapon.customEmojiName
    );
    if (found) return found.toString();
  }
  return weapon.fallbackEmoji || "❔";
}

// Service encapsulating the wheel logic (Single Responsibility / testability)
export class WeaponWheelService {
  constructor(weapons, options = {}) {
    this.weapons = weapons;
    this.rng = options.rng || Math.random;
  }

  pickRandomWeapon() {
    return this.weapons[Math.floor(this.rng() * this.weapons.length)];
  }

  buildWeaponList(highlightIndex, guild) {
    return this.weapons
      .map((w, idx) => {
        const emoji = resolveWeaponEmoji(w, guild);
        const isHighlighted = idx === highlightIndex;
        return isHighlighted
          ? `**➤ ${emoji} ${w.name}**`
          : `ㅤ${emoji} ${w.name}`;
      })
      .join("\n");
  }

  createInitialEmbed() {
    return new EmbedBuilder()
      .setTitle("🎲 Selecting Random Weapon...")
      .setDescription("Let the wheel of fate decide your weapon!")
      .setColor(COLOR_INITIAL);
  }

  createSpinEmbed(highlightIndex, guild) {
    return new EmbedBuilder()
      .setTitle("🎲 Weapon Wheel Spinning...")
      .setDescription(this.buildWeaponList(highlightIndex, guild))
      .setColor(COLOR_SPINNING);
  }

  createSelectionEmbed(finalIndex, guild) {
    return new EmbedBuilder()
      .setTitle("🎲 Weapon Selected!")
      .setDescription(this.buildWeaponList(finalIndex, guild))
      .setColor(COLOR_SELECTION);
  }

  createFinalResultEmbed(userDisplayName, weapon, guild, historyLine) {
    const emoji = resolveWeaponEmoji(weapon, guild);
    let desc = `# ${emoji} ${weapon.name}\n\n*${weapon.description}*`;
    if (historyLine) {
      desc += `\n\n**Last ${HISTORY_SIZE} weapons:** ${historyLine.line}`;
    }
    const builder = new EmbedBuilder()
      .setTitle(`🎲 ${userDisplayName}, your weapon is...`)
      .setDescription(desc)
      .setColor(COLOR_FINAL)
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();
    if (weapon.thumbnail && /^https?:\/\//i.test(weapon.thumbnail)) {
      builder.setThumbnail(weapon.thumbnail);
    }
    return builder;
  }
}
