// Application-owned emoji IDs that your bot can use globally.
// Add new keys as you upload more emojis to the application in the Dev Portal.
// Format: name: "<emojiId>"
export const applicationEmojiIds = {
  sns: "1421096608552063006",
  sa: "1421096598112309371",
  lan: "1421096586485829632",
  ig: "1421096571625406576",
  hh: "1421096555259101289",
  hbg: "1421096544077353011",
  ham: "1421096532727562284",
  gs: "1421096520362491964",
  gl: "1421096508262055979",
  db: "1421096492868833401",
  cb: "1421096477568270388",
  bow: "1421096377957744662",
  lbg: "1421106749921955900",
  ls: "1421106637149700136",
};

export function renderApplicationEmoji(name) {
  const id = applicationEmojiIds[name];
  if (!id) return null;
  // Assuming static emoji; if animated, change to `<a:${name}:${id}>`
  return `<:${name}:${id}>`;
}
