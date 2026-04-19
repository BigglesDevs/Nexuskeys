// commands/public/ticket.js
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { Tickets } = require("../../utils/db");
const { ticketOpenEmbed, closeTicketButton } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Open a support ticket")
    .addStringOption(opt =>
      opt.setName("subject").setDescription("Brief description of your issue").setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("order_id").setDescription("Order ID if this is about a purchase").setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const subject = interaction.options.getString("subject") || "Support Request";
    const orderId = interaction.options.getString("order_id") || null;
    const guild = interaction.guild;

    const channelOptions = {
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
      ],
    };

    if (process.env.DISCORD_TICKET_CATEGORY) {
      channelOptions.parent = process.env.DISCORD_TICKET_CATEGORY;
    }

    const channel = await guild.channels.create(channelOptions);

    const ticket = Tickets.create({
      discord_id: interaction.user.id,
      discord_username: interaction.user.username,
      channel_id: channel.id,
      order_id: orderId,
      subject,
    });

    await channel.send({
      embeds: [ticketOpenEmbed(ticket, interaction.user)],
      components: [closeTicketButton()],
    });

    return interaction.editReply({
      content: `✅ Your ticket has been opened in ${channel}!`,
    });
  },
};
