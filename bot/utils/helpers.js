// bot/utils/helpers.js — shared bot helpers

const isAdmin = (interaction) => {
  const { PermissionFlagsBits } = require("discord.js");
  return (
    interaction.user.id === process.env.ADMIN_DISCORD_ID ||
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  );
};

module.exports = { isAdmin };
