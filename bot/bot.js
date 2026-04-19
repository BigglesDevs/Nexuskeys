// bot/bot.js — NexusKeys bot loader
require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { purchaseLogEmbed, purchaseSuccessEmbed } = require("./utils/embeds");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Load Commands ─────────────────────────────────────────────────────────────
client.commands = new Collection();
const commandFolders = ["public", "admin"];

for (const folder of commandFolders) {
  const folderPath = path.join(__dirname, "commands", folder);
  if (!fs.existsSync(folderPath)) continue;
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));
  for (const file of files) {
    const command = require(path.join(folderPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`  ✓ Loaded command: ${folder}/${file}`);
    }
  }
}

// ── Load Events ───────────────────────────────────────────────────────────────
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js"));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`  ✓ Loaded event: ${file}`);
}

// ── Helpers exported for API use ──────────────────────────────────────────────
async function sendPurchaseLog(order, product) {
  const channelId = process.env.DISCORD_PURCHASE_LOG_CHANNEL;
  if (!channelId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send({ embeds: [purchaseLogEmbed(order, product)] });
  } catch (err) {
    console.error("Purchase log failed:", err.message);
  }
}

async function dmUser(discordId, embeds, components = []) {
  try {
    const user = await client.users.fetch(discordId);
    await user.send({ embeds, components });
    return true;
  } catch (err) {
    console.error(`DM failed for ${discordId}:`, err.message);
    return false;
  }
}

client.login(process.env.DISCORD_TOKEN);

module.exports = { client, sendPurchaseLog, dmUser };
