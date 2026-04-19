// commands/admin/ticketpanel.js
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, PermissionFlagsBits
} = require("discord.js");
const { isAdmin } = require("../../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("[ADMIN] Post the ticket panel in this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName("title").setDescription("Panel title").setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName("description").setDescription("Panel description").setRequired(false)
    ),

  async execute(interaction) {
    if (!isAdmin(interaction)) return interaction.reply({ content: "No permission.", ephemeral: true });

    const title = interaction.options.getString("title") || "NexusKeys Support";
    const description = interaction.options.getString("description") ||
      "Select a category below to open a support ticket. Our team will assist you as soon as possible.";

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle("🎫 " + title)
      .setDescription(description)
      .addFields(
        { name: "📦 Order Issue", value: "Problem with a purchase or key", inline: true },
        { name: "🔧 Technical Support", value: "Installation or error help", inline: true },
        { name: "💬 General Support", value: "Any other questions", inline: true },
        { name: "💳 Billing Issue", value: "Payment or refund queries", inline: true },
        { name: "🐛 Bug Report", value: "Report a problem with our store", inline: true },
        { name: "🤝 Partnership", value: "Business enquiries", inline: true }
      )
      .setFooter({ text: "NexusKeys • Select a category to get started" })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_category")
      .setPlaceholder("Select ticket category…")
      .addOptions([
        { label: "Order Issue", description: "Problem with a purchase or key delivery", value: "order", emoji: "📦" },
        { label: "Technical Support", description: "Installation errors or software issues", value: "technical", emoji: "🔧" },
        { label: "General Support", description: "General questions or enquiries", value: "general", emoji: "💬" },
        { label: "Billing Issue", description: "Payment problems or refund requests", value: "billing", emoji: "💳" },
        { label: "Bug Report", description: "Report a bug or issue with the store", value: "bug", emoji: "🐛" },
        { label: "Partnership", description: "Business or partnership enquiries", value: "partnership", emoji: "🤝" },
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: "✅ Ticket panel posted!", ephemeral: true });
  },
};
