import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  MessageFlags,
  ActivityType,
} from "discord.js";
import { spinCommandData, handleSpinCommand } from "./scripts/spinTheWheel.js";
import { COMMAND_SPIN_NAME } from "./scripts/constants.js";
import {
  logger,
  attachGlobalErrorHandlers,
  interactionContext,
} from "./scripts/logger.js";

// Environment validation
const { DISCORD_TOKEN, CLIENT_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  logger.error("Missing DISCORD_TOKEN or CLIENT_ID in environment.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildEmojisAndStickers],
});

client.once("clientReady", () => {
  logger.info(`${client.user.tag} is online.`);
  registerCommands();
  updatePresence();
});

function updatePresence() {
  try {
    const guildCount = client.guilds.cache.size;
    const activity = {
      name: `Dootin' in ${guildCount} Server${guildCount === 1 ? "" : "s"}`,
      type: ActivityType.Custom,
    };
    client.user.setPresence({ activities: [activity], status: "online" });
    logger.info("Presence updated", { guildCount });
  } catch (err) {
    logger.warn("Failed to update presence", { error: err });
  }
}

// Update presence and log when the bot joins or leaves servers
client.on("guildCreate", (guild) => {
  logger.info("Joined guild", {
    guildId: guild.id,
    guildName: guild.name,
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
  });
  updatePresence();
});

client.on("guildDelete", (guild) => {
  logger.info("Removed from guild", {
    guildId: guild?.id,
    guildName: guild?.name,
  });
  updatePresence();
});

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: [spinCommandData.toJSON()],
    });
    logger.info("Slash commands registered.");
  } catch (err) {
    logger.error("Failed to register commands", { error: err });
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === COMMAND_SPIN_NAME) {
    try {
      await handleSpinCommand(interaction);
    } catch (err) {
      logger.error(
        "Command execution failed",
        interactionContext(interaction, { error: err })
      );
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            content: "⚠️ An error occurred executing the command.",
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: "⚠️ An error occurred executing the command.",
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (replyErr) {
        logger.error(
          "Failed to send error response",
          interactionContext(interaction, { error: replyErr })
        );
      }
    }
  }
});

attachGlobalErrorHandlers();

process.on("SIGINT", () => {
  logger.warn("Received SIGINT, shutting down.");
  client.destroy();
  process.exit(0);
});

client.login(DISCORD_TOKEN).catch((err) => {
  logger.error("Login failed", { error: err });
  process.exit(1);
});
