// events/interactionCreate.js — slash command router only
// Ticket panel interactions handled in ticketHandler.js

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(interaction, client) {
    // Autocomplete
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        try { await command.autocomplete(interaction); } catch (err) { console.error(err); }
      }
      return;
    }

    // Slash commands only — buttons/modals/selects handled by ticketHandler.js
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`Error in /${interaction.commandName}:`, err);
      const msg = { content: "Something went wrong.", ephemeral: true };
      if (interaction.deferred || interaction.replied) await interaction.editReply(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
