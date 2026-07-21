import { SlashCommandBuilder, MessageFlags } from "discord.js";
import {
  SPIN_DURATION_MS,
  SPIN_STEPS,
  COMMAND_SPIN_NAME,
  COMMAND_SPIN_DESCRIPTION,
  COMMAND_SPIN_EXTRA_OPTION,
  COMMAND_SPIN_EXTRA_DESCRIPTION,
  COMMAND_SPIN_EXTRA_HORN_VALUE,
  MAX_CONCURRENT_SPINS,
  FAST_PATH_THRESHOLD_MS,
  REDUCED_STEPS_WHEN_BUSY,
  USER_COOLDOWN_MS,
} from "./constants.js";
import { WeaponWheelService } from "./WeaponWheelService.js";
import {
  acquireSlot,
  releaseSlot,
  pushHistory,
  buildHistoryLine,
  getActiveSpins,
  getWaiterCount,
} from "./helper.js";
import { weapons } from "./weapons.js";
import { huntingHorns } from "./horns.js";
import { logger, interactionContext } from "./helper.js";

const weaponWheelService = new WeaponWheelService(weapons, {
  labelSingular: "Weapon",
  labelPlural: "Weapons",
  historyLabel: "weapons",
});

const hornWheelService = new WeaponWheelService(huntingHorns, {
  labelSingular: "Hunting Horn",
  labelPlural: "Hunting Horns",
  historyLabel: "hunting horns",
});

function getWheelContext(interaction) {
  const extra = interaction.options?.getString?.(COMMAND_SPIN_EXTRA_OPTION);
  const useHorns = extra === COMMAND_SPIN_EXTRA_HORN_VALUE;
  return useHorns
    ? {
      service: hornWheelService,
      items: huntingHorns,
      historyKey: null,
      trackHistory: false,
    }
    : {
      service: weaponWheelService,
      items: weapons,
      historyKey: "weapons",
      trackHistory: true,
    };
}

// Simple per-user cooldown tracking (in-memory; resets on process restart)
const lastUseByUser = new Map();

export const spinCommandData = new SlashCommandBuilder()
  .setName(COMMAND_SPIN_NAME)
  .setDescription(COMMAND_SPIN_DESCRIPTION)
  .addStringOption((option) =>
    option
      .setName(COMMAND_SPIN_EXTRA_OPTION)
      .setDescription(COMMAND_SPIN_EXTRA_DESCRIPTION)
      .addChoices({
        name: "huntinghorns",
        value: COMMAND_SPIN_EXTRA_HORN_VALUE,
      })
  );

export async function handleSpinCommand(interaction) {
  const wheel = getWheelContext(interaction);
  const wheelService = wheel.service;

  logger.info(
    "Spin command invoked",
    interactionContext(interaction, {
      activeSpins: getActiveSpins(),
      cooldownMs: USER_COOLDOWN_MS,
      wheel: wheel.historyKey || "hunting horns",
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
    const quickItem = wheelService.pickRandomItem();
    const displayName =
      interaction.member?.displayName ||
      interaction.user.displayName ||
      interaction.user.username;
    if (wheel.trackHistory) {
      pushHistory(userId, quickItem, wheel.historyKey);
    }
    const quickEmbed = wheelService.createFinalResultEmbed(
      displayName,
      quickItem,
      interaction.guild,
      wheel.trackHistory
        ? buildHistoryLine(userId, interaction.guild, wheel.historyKey)
        : null
    );
    try {
      await interaction.editReply({
        content: "Busy right now, instant result:",
        embeds: [quickEmbed],
      });
      logger.warn(
        "Fast-path (queue too long) result",
        interactionContext(interaction, {
          item: quickItem.name,
          queuedMs: slotInfo.queuedMs,
          wheel: wheel.historyKey || "hunting horns",
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

  // Hybrid step-wise animation with hard duration cap & early break
  const activeSpins = getActiveSpins();
  const busy = activeSpins > Math.max(1, Math.floor(MAX_CONCURRENT_SPINS / 2));
  const veryBusy =
    activeSpins >= MAX_CONCURRENT_SPINS - 1 && getWaiterCount() > 0;
  let stepsToUse = SPIN_STEPS;
  if (busy) stepsToUse = Math.min(REDUCED_STEPS_WHEN_BUSY, stepsToUse);
  if (veryBusy)
    stepsToUse = Math.max(3, Math.min(stepsToUse, Math.ceil(stepsToUse / 2)));

  const maxDuration = veryBusy
    ? Math.min(SPIN_DURATION_MS, 3000)
    : SPIN_DURATION_MS;
  const perStep = maxDuration / Math.max(stepsToUse, 1);
  const finalItem = wheelService.pickRandomItem();
  const finalIndex = wheel.items.indexOf(finalItem);
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
          highlight = Math.floor(Math.random() * wheel.items.length);
        } while (highlight === finalIndex && stepsToUse > 2);
      }
      await interaction.editReply({
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
    await interaction.editReply({
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
    if (wheel.trackHistory) {
      pushHistory(userId, finalItem, wheel.historyKey);
    }
    const finalEmbed = wheelService.createFinalResultEmbed(
      displayName,
      finalItem,
      interaction.guild,
      wheel.trackHistory
        ? buildHistoryLine(userId, interaction.guild, wheel.historyKey)
        : null
    );
    await interaction.editReply({ embeds: [finalEmbed] });
    logger.info(
      "Spin command completed",
      interactionContext(interaction, {
        item: finalItem.name,
        wheel: wheel.historyKey || "hunting horns",
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
