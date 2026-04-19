// events/ticketHandler.js — handles ticket panel interactions
const {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle
} = require("discord.js");
const { Tickets } = require("../utils/db");
const { closeTicketButton } = require("../utils/embeds");

// Category config
const CATEGORIES = {
  order:       { label: "Order Issue",        emoji: "📦", color: 0x6366f1, needsModal: true  },
  technical:   { label: "Technical Support",  emoji: "🔧", color: 0x3b82f6, needsModal: false },
  general:     { label: "General Support",    emoji: "💬", color: 0x22c55e, needsModal: false },
  billing:     { label: "Billing Issue",      emoji: "💳", color: 0xf59e0b, needsModal: true  },
  bug:         { label: "Bug Report",         emoji: "🐛", color: 0xef4444, needsModal: false },
  partnership: { label: "Partnership",        emoji: "🤝", color: 0x8b5cf6, needsModal: false },
};

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(interaction, client) {

    // ── Dropdown: user selects a ticket category ──────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_category") {
      const value = interaction.values[0];
      const cat = CATEGORIES[value];
      if (!cat) return;

      // Order and billing tickets → show modal first to collect details
      if (cat.needsModal) {
        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal_${value}`)
          .setTitle(cat.emoji + " " + cat.label);

        if (value === "order") {
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("order_id")
                .setLabel("Order ID")
                .setPlaceholder("e.g. NX-1ABC2DEF")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("product_name")
                .setLabel("What did you purchase?")
                .setPlaceholder("e.g. Windows 11 Pro — 1 Month")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("issue")
                .setLabel("Describe your issue")
                .setPlaceholder("e.g. Key isn't working, didn't receive key, etc.")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(500)
            )
          );
        } else if (value === "billing") {
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("order_id")
                .setLabel("Order ID (if applicable)")
                .setPlaceholder("e.g. NX-1ABC2DEF or leave blank")
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(50)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("issue")
                .setLabel("Describe your billing issue")
                .setPlaceholder("e.g. Charged but no key received, need refund, etc.")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(500)
            )
          );
        }

        return interaction.showModal(modal);
      }

      // No modal needed — create ticket straight away
      await interaction.deferReply({ ephemeral: true });
      await createTicketChannel(interaction, cat, value, {});
      return;
    }

    // ── Modal submit ──────────────────────────────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal_")) {
      const value = interaction.customId.replace("ticket_modal_", "");
      const cat = CATEGORIES[value];
      await interaction.deferReply({ ephemeral: true });

      const fields = {};
      try { fields.order_id = interaction.fields.getTextInputValue("order_id"); } catch (_) {}
      try { fields.product_name = interaction.fields.getTextInputValue("product_name"); } catch (_) {}
      try { fields.issue = interaction.fields.getTextInputValue("issue"); } catch (_) {}

      await createTicketChannel(interaction, cat, value, fields);
      return;
    }

    // ── Close ticket button ───────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === "close_ticket") {
      const ticket = Tickets.getByChannel(interaction.channelId);
      if (!ticket) return interaction.reply({ content: "No ticket found.", ephemeral: true });

      const isOwner = ticket.discord_id === interaction.user.id;
      const isAdmin = interaction.user.id === process.env.ADMIN_DISCORD_ID ||
        interaction.memberPermissions?.has("Administrator");

      if (!isOwner && !isAdmin) {
        return interaction.reply({ content: "Only the ticket owner or admin can close this.", ephemeral: true });
      }

      Tickets.close(ticket.id);

      const closeEmbed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle("🔒 Ticket Closed")
        .setDescription(`Ticket **${ticket.id}** closed by <@${interaction.user.id}>.\nThis channel will be deleted in 5 seconds.`)
        .setTimestamp();

      await interaction.reply({ embeds: [closeEmbed] });
      setTimeout(async () => { try { await interaction.channel.delete(); } catch (_) {} }, 5000);
    }
  },
};

// ── Helper: create the ticket channel ────────────────────────────────────────
async function createTicketChannel(interaction, cat, value, fields) {
  const guild = interaction.guild;

  // Check for duplicate open ticket
  const existing = guild.channels.cache.find(
    c => c.name === `${value}-${interaction.user.username}` && c.type === ChannelType.GuildText
  );
  if (existing) {
    return interaction.editReply({ content: `You already have an open ticket: ${existing}` });
  }

  const channelOptions = {
    name: `${value}-${interaction.user.username}`,
    type: ChannelType.GuildText,
    topic: `${cat.emoji} ${cat.label} | ${interaction.user.tag}`,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
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
    order_id: fields.order_id || null,
    subject: cat.label,
  });

  // Build the ticket open embed
  const embed = new EmbedBuilder()
    .setColor(cat.color)
    .setTitle(`${cat.emoji} ${cat.label} — ${ticket.id}`)
    .setDescription(`Welcome <@${interaction.user.id}>! A staff member will assist you shortly.\n\nPlease provide any additional details below.`)
    .setTimestamp();

  // Add fields from modal if present
  if (fields.order_id) embed.addFields({ name: "📦 Order ID", value: fields.order_id, inline: true });
  if (fields.product_name) embed.addFields({ name: "🛒 Product", value: fields.product_name, inline: true });
  if (fields.issue) embed.addFields({ name: "📝 Issue Description", value: fields.issue, inline: false });

  embed.addFields({ name: "Ticket ID", value: ticket.id, inline: true });
  embed.setFooter({ text: "NexusKeys Support • Click Close Ticket when resolved" });

  // Close button
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

  await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });

  await interaction.editReply({ content: `✅ Ticket opened! Head to ${channel}` });
}
