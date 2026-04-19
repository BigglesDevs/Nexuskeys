// bot/deploy-commands.js — run once: node bot/deploy-commands.js
require("dotenv").config();
const { REST, Routes } = require("@discordjs/rest");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandFolders = ["public", "admin"];

for (const folder of commandFolders) {
  const folderPath = path.join(__dirname, "commands", folder);
  if (!fs.existsSync(folderPath)) continue;
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));
  for (const file of files) {
    const command = require(path.join(folderPath, file));
    if (command.data) {
      commands.push(command.data.toJSON());
      console.log(`  ✓ Registered: ${folder}/${file}`);
    }
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`\nDeploying ${commands.length} slash commands to guild ${process.env.DISCORD_GUILD_ID}...\n`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands }
    );
    console.log("✅ All commands deployed successfully!");
  } catch (err) {
    console.error("❌ Deploy failed:", err);
  }
})();
