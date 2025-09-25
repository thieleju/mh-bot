import { describe, it, expect } from "vitest";
import { WeaponWheelService } from "../scripts/WeaponWheelService.js";

const mockWeapons = [
  {
    name: "Great Sword",
    fallbackEmoji: "🗡️",
    description: "Big blade",
    thumbnail: "url1",
  },
  {
    name: "Long Sword",
    fallbackEmoji: "⚔️",
    description: "Long blade",
    thumbnail: "url2",
  },
  {
    name: "Hammer",
    fallbackEmoji: "🔨",
    description: "Bonk",
    thumbnail: "url3",
  },
];

describe("WeaponWheelService", () => {
  it("pickRandomWeapon returns one from list", () => {
    const svc = new WeaponWheelService(mockWeapons, { rng: () => 0.5 });
    const w = svc.pickRandomWeapon();
    expect(mockWeapons).toContain(w);
  });
  it("buildWeaponList highlights correct index", () => {
    const svc = new WeaponWheelService(mockWeapons, { rng: () => 0 });
    const list = svc.buildWeaponList(1, null);
    const lines = list.split("\n");
    expect(lines[1]).toMatch(/\*\*➤/); // second weapon highlighted
    expect(lines[0]).not.toMatch(/\*\*➤/);
  });
  it("createFinalResultEmbed constructs expected embed (without history)", () => {
    const svc = new WeaponWheelService(mockWeapons, { rng: () => 0 });
    const weapon = mockWeapons[2];
    const builder = svc.createFinalResultEmbed("User", weapon, null, null);
    let obj;
    expect(() => {
      obj = builder.toJSON();
    }).not.toThrow();
    expect(obj && typeof obj).toBe("object");
    const title = obj.title || "";
    const desc = obj.description || "";
    expect(title).toMatch(/User/);
    expect(desc).toContain(weapon.name);
    expect(desc).not.toMatch(/Last \d+ weapons/);
  });
});
