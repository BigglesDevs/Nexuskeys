require("dotenv").config();

console.log("╔══════════════════════════════════╗");
console.log("║     NexusKeys Platform v1.0      ║");
console.log("╚══════════════════════════════════╝");

// Auto-deploy slash commands on every start
const { REST, Routes } = require("@discordjs/rest");
const fs = require("fs");
const path = require("path");

async function deployCommands() {
try {
const commands = [];
for (const folder of ["public", "admin"]) {
const folderPath = path.join(__dirname, "bot/commands", folder);
if (!fs.existsSync(folderPath)) continue;
for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))) {
const command = require(path.join(folderPath, file));
if (command.data) commands.push(command.data.toJSON());
}
}
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
await rest.put(
Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
{ body: commands }
);
console.log(`✅ Deployed ${commands.length} slash commands`);
} catch (err) {
console.error("⚠ Command deploy failed:", err.message);
}
}

deployCommands();

// Start bot
require("./bot/bot");

// Start API after bot connects
setTimeout(() => {
require("./api/server");
}, 2000);
