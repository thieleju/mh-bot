# mhw-wheel-bot
Discord Bot that randomly selects Monster Hunter World weapons

A Discord.js bot that provides a `/randomweapon` slash command to randomly select one of the 14 Monster Hunter World weapons with an animated spinning wheel effect.

## Features

- 🎲 `/randomweapon` slash command
- 🎯 Random selection from all 14 MHW weapons
- ⚡ Animated spinning wheel effect
- 📋 Detailed weapon descriptions
- 🎨 Beautiful Discord embeds

## Setup

### Prerequisites

- Node.js 16.9.0 or newer
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

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/thieleju/mhw-wheel-bot.git
   cd mhw-wheel-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your Discord credentials:
   ```
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   ```

5. Start the bot:
   ```bash
   npm start
   ```

### Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t mhw-wheel-bot .
   ```

2. Run the container:
   ```bash
   docker run -d --name mhw-wheel-bot --env-file .env mhw-wheel-bot
   ```

Or use Docker Compose:

```yaml
version: '3.8'
services:
  mhw-wheel-bot:
    build: .
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - CLIENT_ID=${CLIENT_ID}
    restart: unless-stopped
```

## Usage

Once the bot is running and invited to your Discord server, use:

```
/randomweapon
```

The bot will display an animated embed that cycles through weapons before settling on your random selection!

## Weapons Included

- Great Sword ⚔️
- Long Sword 🗾
- Sword and Shield 🛡️
- Dual Blades ⚡
- Hammer 🔨
- Hunting Horn 🎺
- Lance 🏹
- Gunlance 💥
- Switch Axe ⚙️
- Charge Blade ⚡
- Insect Glaive 🦗
- Light Bowgun 🏹
- Heavy Bowgun 🎯
- Bow 🏹

## License

MIT License - see [LICENSE](LICENSE) file for details.
