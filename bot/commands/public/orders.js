// commands/public/orders.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Orders } = require("../../utils/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("orders")
    .setDescription("View your recent orders"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const orders = Orders.getByUser(interaction.user.id, 5);

    if (!orders.length) {
      return interaction.editReply({ content: "You have no orders yet. Use `/buy` to get started!" });
    }

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle("📋 Your Recent Orders");

    for (const o of orders) {
      embed.addFields({
        name: `${o.id} — ${o.product_name}${o.variant_name ? ` (${o.variant_name})` : ""}`,
        value: `**Amount:** $${Number(o.amount).toFixed(2)} • **Status:** ${o.status === "completed" ? "✅" : "⏳"} ${o.status}\n**Date:** ${new Date(o.created_at).toLocaleDateString()}`,
        inline: false,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
