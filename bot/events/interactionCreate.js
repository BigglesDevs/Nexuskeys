const { Tickets } = require("../utils/db");
const { ticketCloseEmbed } = require("../utils/embeds");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(interaction, client) {
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        try { await command.autocomplete(interaction); } catch (err) { console.error(err); }
      }
      return;
    }

    if (interaction.isButton() && interaction.customId === "close_ticket") {
      const ticket = Tickets.getByChannel(interaction.channelId);
      if (!ticket) return interaction.reply({ content: "No ticket found.", ephemeral: true });
      const isOwner = ticket.discord_id === interaction.user.id;
      const isAdmin = interaction.user.id === process.env.ADMIN_DISCORD_ID ||
        interaction.memberPermissions?.has("Administrator");
      if (!isOwner && !isAdmin) return interaction.reply({ content: "Only the ticket owner or admin can close this.", ephemeral: true });
      Tickets.close(ticket.id);
      await interaction.reply({ embeds: [ticketCloseEmbed(ticket)] });
      setTimeout(async () => { try { await interaction.channel.delete(); } catch (_) {} }, 5000);
      return;
    }

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
