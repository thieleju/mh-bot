import { SlashCommandBuilder, MessageFlags } from "discord.js";
import {
  SPIN_DURATION_MS,
  SPIN_STEPS,
  COMMAND_SPIN_NAME,
  COMMAND_SPIN_DESCRIPTION,
  MAX_CONCURRENT_SPINS,
  FAST_PATH_THRESHOLD_MS,
  REDUCED_STEPS_WHEN_BUSY,
  USER_COOLDOWN_MS,
  HISTORY_SIZE,
} from "./constants.js";
import {
  WeaponWheelService,
  resolveWeaponEmoji,
} from "./WeaponWheelService.js";
import { weapons } from "./weapons.js";
import { logger, interactionContext } from "./logger.js";

// Lightweight in-file concurrency manager (avoids extra file churn)
let activeSpins = 0;
const waiters = [];

function acquireSlot() {
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

function releaseSlot() {
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

const wheelService = new WeaponWheelService(weapons);

// Per-user in-memory history: Map<userId, Weapon[]> (newest first)
const userWeaponHistory = new Map();

function pushHistory(userId, weapon) {
  let arr = userWeaponHistory.get(userId);
  if (!arr) {
    arr = [];
    userWeaponHistory.set(userId, arr);
  }
  arr.unshift(weapon);
  if (arr.length > HISTORY_SIZE) arr.length = HISTORY_SIZE;
}

function buildHistoryLine(userId, guild) {
  const arr = userWeaponHistory.get(userId);
  if (!arr || !arr.length) return null;
  const slice = arr.slice(0, HISTORY_SIZE);
  const emojis = slice.map((w) => resolveWeaponEmoji(w, guild));
  return { count: slice.length, line: emojis.join(" ") };
}

// Simple per-user cooldown tracking (in-memory; resets on process restart)
const lastUseByUser = new Map();

export const spinCommandData = new SlashCommandBuilder()
  .setName(COMMAND_SPIN_NAME)
  .setDescription(COMMAND_SPIN_DESCRIPTION);

export async function handleSpinCommand(interaction) {
  logger.info(
    "Spin command invoked",
    interactionContext(interaction, {
      activeSpins,
      cooldownMs: USER_COOLDOWN_MS,
    })
  );

  const userId = interaction.user.id;
  const now = Date.now();
  const last = lastUseByUser.get(userId) || 0;
  const diff = now - last;
  if (diff < USER_COOLDOWN_MS) {
    const remaining = USER_COOLDOWN_MS - diff;
    // Lightweight immediate reply (ephemeral via flags)
    try {
      await interaction.reply({
        content: `⏳ Please wait ${(Math.ceil(remaining / 100) / 10).toFixed(
          1
        )}s before spinning again.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (e) {
      logger.warn(
        "Cooldown reply failed",
        interactionContext(interaction, { error: e.message })
      );
    }
    return;
  }

  // Record usage timestamp early (prevents spam race); will be overwritten when completed
  lastUseByUser.set(userId, now);

  // Defer immediately so we can safely exceed 3s
  try {
    await interaction.deferReply();
  } catch (e) {
    logger.error(
      "Failed to defer interaction",
      interactionContext(interaction, { error: e })
    );
    return;
  }

  // Acquire slot or fast-path fallback
  let slotInfo;
  try {
    slotInfo = await Promise.race([
      acquireSlot(),
      new Promise((res) =>
        setTimeout(
          () => res({ queuedMs: FAST_PATH_THRESHOLD_MS + 1, fastPath: true }),
          FAST_PATH_THRESHOLD_MS
        )
      ),
    ]);
  } catch (e) {
    logger.error(
      "Failed to acquire slot",
      interactionContext(interaction, { error: e })
    );
    await interaction.editReply({ content: "System busy. Try again shortly." });
    return;
  }

  const release = () => {
    try {
      releaseSlot();
    } catch (e) {
      logger.error("Release slot failed", { error: e });
    }
  };

  if (slotInfo.fastPath) {
    const quickWeapon = wheelService.pickRandomWeapon();
    const displayName =
      interaction.member?.displayName ||
      interaction.user.displayName ||
      interaction.user.username;
    pushHistory(userId, quickWeapon);
    const quickEmbed = wheelService.createFinalResultEmbed(
      displayName,
      quickWeapon,
      interaction.guild,
      buildHistoryLine(userId, interaction.guild)
    );
    try {
      await interaction.editReply({
        content: "Busy right now, instant result:",
        embeds: [quickEmbed],
      });
      logger.warn(
        "Fast-path (queue too long) result",
        interactionContext(interaction, {
          weapon: quickWeapon.name,
          queuedMs: slotInfo.queuedMs,
        })
      );
    } catch (err) {
      logger.error(
        "Fast-path reply failed",
        interactionContext(interaction, { error: err })
      );
    }
    // Adjust cooldown slightly shorter for fast-path since user got no animation value
    lastUseByUser.set(
      userId,
      Date.now() - Math.min(1000, USER_COOLDOWN_MS / 2)
    );
    return; // Did not take slot
  }

  // Emoji cache warm
  if (interaction.guild) {
    try {
      await interaction.guild.emojis.fetch();
    } catch (e) {
      logger.warn(
        "Failed to fetch emojis",
        interactionContext(interaction, { error: e.message })
      );
    }
  }

  // Send initial embed
  try {
    const initial = wheelService.createInitialEmbed();
    await interaction.editReply({ embeds: [initial] });
  } catch (err) {
    logger.error(
      "Failed to send initial reply",
      interactionContext(interaction, { error: err })
    );
    release();
    return;
  }

  // Fetch reply reference
  let reply;
  try {
    reply = await interaction.fetchReply();
  } catch (err) {
    logger.error(
      "Failed to fetch reply",
      interactionContext(interaction, { error: err })
    );
    release();
    return;
  }

  // Hybrid step-wise animation with hard duration cap & early break
  const busy = activeSpins > Math.max(1, Math.floor(MAX_CONCURRENT_SPINS / 2));
  const veryBusy =
    activeSpins >= MAX_CONCURRENT_SPINS - 1 && waiters.length > 0;
  let stepsToUse = SPIN_STEPS;
  if (busy) stepsToUse = Math.min(REDUCED_STEPS_WHEN_BUSY, stepsToUse);
  if (veryBusy)
    stepsToUse = Math.max(3, Math.min(stepsToUse, Math.ceil(stepsToUse / 2)));

  const maxDuration = veryBusy
    ? Math.min(SPIN_DURATION_MS, 3000)
    : SPIN_DURATION_MS;
  const perStep = maxDuration / Math.max(stepsToUse, 1);
  const finalWeapon = wheelService.pickRandomWeapon();
  const finalIndex = weapons.indexOf(finalWeapon);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const animStart = Date.now();

  try {
    for (let step = 0; step < stepsToUse; step++) {
      // Wait until scheduled time for this step (except step 0)
      if (step > 0) {
        const target = animStart + perStep * step;
        let wait = target - Date.now();
        if (wait > 0) await sleep(wait);
      }
      const isLast = step === stepsToUse - 1;
      // Avoid repeating same highlight sequentially (minor UX improvement)
      let highlight;
      if (isLast) {
        highlight = finalIndex;
      } else {
        do {
          highlight = Math.floor(Math.random() * weapons.length);
        } while (highlight === finalIndex && stepsToUse > 2); // small variety tweak
      }
      await reply.edit({
        embeds: [wheelService.createSpinEmbed(highlight, interaction.guild)],
      });
    }
  } catch (loopErr) {
    logger.error(
      "Spin animation failed",
      interactionContext(interaction, { error: loopErr })
    );
    release();
    return;
  }

  try {
    await reply.edit({
      embeds: [
        wheelService.createSelectionEmbed(finalIndex, interaction.guild),
      ],
    });
  } catch (selErr) {
    logger.error(
      "Failed to show selection embed",
      interactionContext(interaction, { error: selErr })
    );
  }

  try {
    const displayName =
      interaction.member?.displayName ||
      interaction.user.displayName ||
      interaction.user.username;
    pushHistory(userId, finalWeapon);
    const finalEmbed = wheelService.createFinalResultEmbed(
      displayName,
      finalWeapon,
      interaction.guild,
      buildHistoryLine(userId, interaction.guild)
    );
    await reply.edit({ embeds: [finalEmbed] });
    logger.info(
      "Spin command completed",
      interactionContext(interaction, {
        weapon: finalWeapon.name,
        steps: stepsToUse,
        queuedMs: slotInfo.queuedMs,
        durationMs: Date.now() - animStart,
      })
    );
  } catch (finalErr) {
    logger.error(
      "Failed to send final embed",
      interactionContext(interaction, { error: finalErr })
    );
  } finally {
    lastUseByUser.set(userId, Date.now()); // finalize cooldown start
    release();
  }
}
