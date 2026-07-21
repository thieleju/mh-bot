import { EmbedBuilder } from "discord.js";
import {
  COLOR_INITIAL,
  COLOR_SPINNING,
  COLOR_SELECTION,
  COLOR_FINAL,
  FOOTER_TEXT,
  HISTORY_SIZE,
} from "./constants.js";
import { resolveEmoji } from "./helper.js";

// Service encapsulating the wheel logic (Single Responsibility / testability)
export class WeaponWheelService {
  constructor(items, options = {}) {
    this.items = items;
    this.rng = options.rng || Math.random;
    this.labelSingular = options.labelSingular || "Weapon";
    this.labelPlural = options.labelPlural || `${this.labelSingular}s`;
    this.historyLabel = options.historyLabel || this.labelPlural.toLowerCase();
  }

  pickRandomItem() {
    return this.items[Math.floor(this.rng() * this.items.length)];
  }

  pickRandomWeapon() {
    return this.pickRandomItem();
  }

  buildItemList(highlightIndex, guild) {
    return this.items
      .map((w, idx) => {
        const emoji = resolveEmoji(w, guild);
        const isHighlighted = idx === highlightIndex;
        return isHighlighted
          ? `**➤ ${emoji} ${w.name}**`
          : `ㅤ${emoji} ${w.name}`;
      })
      .join("\n");
  }

  buildWeaponList(highlightIndex, guild) {
    return this.buildItemList(highlightIndex, guild);
  }

  createInitialEmbed() {
    return new EmbedBuilder()
      .setTitle(`🎲 Selecting Random ${this.labelSingular}...`)
      .setDescription(
        `Let the wheel of fate decide your ${this.labelSingular.toLowerCase()}!`
      )
      .setColor(COLOR_INITIAL);
  }

  createSpinEmbed(highlightIndex, guild) {
    const wheelEmoji = "🎲";
    return new EmbedBuilder()
      .setTitle(`${wheelEmoji} ${this.labelSingular} Wheel Spinning...`)
      .setDescription(this.buildItemList(highlightIndex, guild))
      .setColor(COLOR_SPINNING);
  }

  createSelectionEmbed(finalIndex, guild) {
    return new EmbedBuilder()
      .setTitle(`🎲 ${this.labelSingular} Selected!`)
      .setDescription(this.buildItemList(finalIndex, guild))
      .setColor(COLOR_SELECTION);
  }

  formatAffinity(affinity) {
    if (affinity == null) return null;
    if (typeof affinity === "string") return affinity;
    return `${affinity > 0 ? "+" : ""}${affinity}%`;
  }

  formatElement(element) {
    if (element == null) return null;
    return element;
  }

  createFinalResultEmbed(userDisplayName, item, guild, historyLine) {
    const emoji = resolveEmoji(item, guild);
    let desc = `# ${emoji} ${item.name}\n\n*${item.description}*`;
    const details = [];
    if (item.attack != null) details.push(`**Attack:** ${item.attack}`);
    const element = this.formatElement(item.element);
    if (element) details.push(`**Element:** ${element}`);
    const affinity = this.formatAffinity(item.affinity);
    if (affinity) details.push(`**Affinity:** ${affinity}`);
    if (item.echoBubble) {
      details.push(`**Echo Bubble:** ${item.echoBubble}`);
    }
    if (Array.isArray(item.skills) && item.skills.length) {
      details.push(`**Skills:** ${item.skills.join(", ")}`);
    }
    if (details.length) {
      desc += `\n\n${details.join("\n")}`;
    }
    if (historyLine) {
      desc += `\n\n**Last ${HISTORY_SIZE} ${this.historyLabel}:** ${historyLine.line}`;
    }
    const builder = new EmbedBuilder()
      .setTitle(`🎲 ${userDisplayName}, your ${this.labelSingular} is...`)
      .setDescription(desc)
      .setColor(COLOR_FINAL)
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();
    if (item.thumbnail && /^https?:\/\//i.test(item.thumbnail)) {
      builder.setThumbnail(item.thumbnail);
    }
    return builder;
  }
}
