# mh-bot

Discord Bot that randomly selects Monster Hunter weapons

A Discord.js bot that provides a `/randomweapon` slash command to randomly select one of the 14 Monster Hunter weapons with an animated spinning wheel effect.

## Features

- 🎲 `/randomweapon` slash command
- 🎯 Random selection from all 14 MHW weapons
- ⚡ Animated spinning wheel effect

## Setup

### Prerequisites

- Node.js 22 or newer
- A Discord application and bot token

### Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token
5. Go to OAuth2 > General and copy the Application ID
6. Go to OAuth2 > URL Generator:
   - Select "bot" and "applications.commands" scopes
   - Select "Send Messages" and "Use Slash Commands" permissions
   - Use the generated URL to invite the bot to your server

### Docker Deployment

```bash
docker build -t mhw-wheel-bot:latest .
```

```bash
docker run -d --name mhw-wheel-bot \
  -e DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN \
  -e CLIENT_ID=YOUR_APPLICATION_CLIENT_ID \
  --restart unless-stopped \
  mhw-wheel-bot:latest
```

## License

MIT License - see [LICENSE](LICENSE) file for details.
