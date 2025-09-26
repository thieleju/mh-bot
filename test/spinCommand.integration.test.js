import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Set fast timing BEFORE loading production code
process.env.WHEEL_SPIN_DURATION_MS = "150"; // was 500
process.env.WHEEL_SPIN_STEPS = "3"; // was 4 / 10
process.env.WHEEL_USER_COOLDOWN_MS = "50"; // shorter cooldown

let handleSpinCommand; // will be populated via dynamic import in beforeAll

// Minimal mock structures to simulate Discord.js interaction for integration-ish test
function createMockInteraction() {
  const edits = [];
  let replied = false;
  let deferred = false;
  const replyObj = {
    edit: vi.fn(async (payload) => {
      edits.push(payload);
      return replyObj;
    }),
  };
  return {
    user: { id: "user1", username: "TestUser", displayName: "TestUser" },
    member: null,
    guild: {
      emojis: {
        cache: { find: () => undefined },
        fetch: vi.fn(async () => {}),
      },
    },
    commandName: "spinthewheel",
    replied,
    deferred,
    deferReply: vi.fn(async () => {
      deferred = true;
    }),
    reply: vi.fn(async () => {
      replied = true;
    }),
    editReply: vi.fn(async (payload) => {
      edits.push(payload);
      return payload;
    }),
    fetchReply: vi.fn(async () => replyObj),
  };
}

// Speed up tests by reducing timing constants via environment (if referenced)
process.env.WHEEL_SPIN_DURATION_MS = "500";
process.env.WHEEL_SPIN_STEPS = "4";
process.env.WHEEL_USER_COOLDOWN_MS = "10";

describe("handleSpinCommand integration", () => {
  beforeAll(async () => {
    ({ handleSpinCommand } = await import("../scripts/spinTheWheel.js"));
  });
  beforeEach(() => {
    // Clear any timers or state if needed between tests
  });

  it("completes a spin and edits message multiple times", async () => {
    const interaction = createMockInteraction();
    await handleSpinCommand(interaction);
    // Expect edits for animation and final embeds
    expect(interaction.editReply).toHaveBeenCalled();
    // Ensure one of the edits contains an embed payload
    const calls = interaction.editReply.mock.calls;
    const hasEmbeds = calls.some(
      (args) => Array.isArray(args) && args[0] && args[0].embeds
    );
    expect(hasEmbeds).toBe(true);
  });

  it("enforces cooldown on rapid second call", async () => {
    const first = createMockInteraction();
    await handleSpinCommand(first);
    const second = createMockInteraction();
    second.user.id = "user1";
    await handleSpinCommand(second);
    // Second should attempt a direct ephemeral reply (flags)
    expect(second.reply).toHaveBeenCalled();
  });
});
