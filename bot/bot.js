require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { purchaseLogEmbed, purchaseSuccessEmbed } = require("./utils/embeds");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.commands = new Collection();

for (const folder of ["public", "admin"]) {
  const folderPath = path.join(__dirname, "commands", folder);
  if (!fs.existsSync(folderPath)) continue;
  for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))) {
    const command = require(path.join(folderPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`  ✓ Loaded command: ${folder}/${file}`);
    }
  }
}

for (const file of fs.readdirSync(path.join(__dirname, "events")).filter(f => f.endsWith(".js"))) {
  const event = require(path.join(__dirname, "events", file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
  else client.on(event.name, (...args) => event.execute(...args, client));
  console.log(`  ✓ Loaded event: ${file}`);
}

async function sendPurchaseLog(order, product) {
  const channelId = process.env.DISCORD_PURCHASE_LOG_CHANNEL;
  if (!channelId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send({ embeds: [purchaseLogEmbed(order, product)] });
  } catch (err) { console.error("Purchase log failed:", err.message); }
}

async function dmUser(discordId, embeds) {
  try {
    const user = await client.users.fetch(discordId);
    await user.send({ embeds });
    return true;
  } catch (err) { console.error(`DM failed:`, err.message); return false; }
}

client.login(process.env.DISCORD_TOKEN);
module.exports = { client, sendPurchaseLog, dmUser };
