import { EmbedBuilder } from "discord.js";
import {
  COLOR_INITIAL,
  COLOR_SPINNING,
  COLOR_SELECTION,
  COLOR_FINAL,
  FOOTER_TEXT,
  HISTORY_SIZE,
} from "./constants.js";
import { resolveEmoji } from "./emojis.js";

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
        const emoji = resolveEmoji(w, guild);
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
    const wheelEmoji = "🎲"; //resolveEmoji("weapons", guild) || "🎲";
    return new EmbedBuilder()
      .setTitle(`${wheelEmoji} Weapon Wheel Spinning...`)
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
    const emoji = resolveEmoji(weapon, guild);
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
