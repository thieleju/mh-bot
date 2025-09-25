const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, REST, Routes } = require('discord.js');
require('dotenv/config');

// Monster Hunter World weapons
const weapons = [
    { name: 'Great Sword', emoji: '⚔️', description: 'A massive two-handed sword with powerful charged attacks.' },
    { name: 'Long Sword', emoji: '🗾', description: 'A swift katana with spirit gauge mechanics and flowing combos.' },
    { name: 'Sword and Shield', emoji: '🛡️', description: 'Versatile weapon with blocking capability and item usage while drawn.' },
    { name: 'Dual Blades', emoji: '⚡', description: 'Fast-hitting paired weapons with demon mode for enhanced mobility.' },
    { name: 'Hammer', emoji: '🔨', description: 'Blunt weapon specializing in head damage and stunning monsters.' },
    { name: 'Hunting Horn', emoji: '🎺', description: 'Support weapon that buffs the team while dealing KO damage.' },
    { name: 'Lance', emoji: '🏹', description: 'Defensive weapon with a strong shield and precise thrusting attacks.' },
    { name: 'Gunlance', emoji: '💥', description: 'Lance with explosive shells for additional damage and unique combos.' },
    { name: 'Switch Axe', emoji: '⚙️', description: 'Transforming weapon switching between axe and sword modes.' },
    { name: 'Charge Blade', emoji: '⚡', description: 'Technical weapon storing energy for devastating elemental discharges.' },
    { name: 'Insect Glaive', emoji: '🦗', description: 'Aerial weapon with a kinsect companion for buffs and mobility.' },
    { name: 'Light Bowgun', emoji: '🏹', description: 'Mobile ranged weapon with rapid fire and various ammo types.' },
    { name: 'Heavy Bowgun', emoji: '🎯', description: 'Powerful ranged weapon with high damage and special ammo.' },
    { name: 'Bow', emoji: '🏹', description: 'Agile ranged weapon with charging shots and coating varieties.' }
];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
    registerCommands();
});

async function registerCommands() {
    const commands = [
        new SlashCommandBuilder()
            .setName('randomweapon')
            .setDescription('Get a random Monster Hunter weapon!')
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'randomweapon') {
        // Create initial embed
        const embed = new EmbedBuilder()
            .setTitle('🎲 Selecting Random Weapon...')
            .setDescription('Let the wheel of fate decide your weapon!')
            .setColor(0xFFD700);

        const reply = await interaction.reply({ embeds: [embed], fetchReply: true });

        // Simulate wheel spinning with multiple updates
        const spinDuration = 3000; // 3 seconds
        const updateInterval = 200; // Update every 200ms
        let currentTime = 0;

        const spinInterval = setInterval(() => {
            currentTime += updateInterval;
            const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];
            
            const spinEmbed = new EmbedBuilder()
                .setTitle('🎲 Weapon Wheel Spinning...')
                .setDescription(`**${randomWeapon.emoji} ${randomWeapon.name}**`)
                .setColor(0xFF6600);

            reply.edit({ embeds: [spinEmbed] });

            if (currentTime >= spinDuration) {
                clearInterval(spinInterval);
                
                // Final selection
                const finalWeapon = weapons[Math.floor(Math.random() * weapons.length)];
                const finalEmbed = new EmbedBuilder()
                    .setTitle('🎯 Your Random Weapon!')
                    .setDescription(`**${finalWeapon.emoji} ${finalWeapon.name}**\n\n*${finalWeapon.description}*`)
                    .setColor(0x00FF00)
                    .setFooter({ text: 'Good luck on your hunt!' })
                    .setTimestamp();

                reply.edit({ embeds: [finalEmbed] });
            }
        }, updateInterval);
    }
});

client.login(process.env.DISCORD_TOKEN);