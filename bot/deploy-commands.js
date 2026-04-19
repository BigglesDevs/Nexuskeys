require("dotenv").config();
const { REST, Routes } = require("@discordjs/rest");
const fs = require("fs");
const path = require("path");

const commands = [];
for (const folder of ["public", "admin"]) {
  const folderPath = path.join(__dirname, "commands", folder);
  if (!fs.existsSync(folderPath)) continue;
  for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))) {
    const command = require(path.join(folderPath, file));
    if (command.data) { commands.push(command.data.toJSON()); console.log(`  ✓ ${folder}/${file}`); }
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log(`\nDeploying ${commands.length} commands...`);
    await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), { body: commands });
    console.log("✅ Commands deployed!");
  } catch (err) { console.error("❌ Deploy failed:", err); }
})();
