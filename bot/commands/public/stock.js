// commands/public/stock.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { Products, Variants, Keys } = require("../../utils/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stock")
    .setDescription("Check current stock levels for all products"),

  async execute(interaction) {
    await interaction.deferReply();
    const products = Products.getAll();

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle("📦 Current Stock Levels")
      .setTimestamp();

    for (const p of products) {
      const variants = Variants.getByProduct(p.id);
      const lines = variants.map(v => {
        const s = Keys.stock(v.id);
        const icon = s === 0 ? "🔴" : s <= 5 ? "🟡" : "🟢";
        return `${icon} ${v.name} — **${s}** keys`;
      }).join("\n") || "No variants";

      embed.addFields({ name: p.name, value: lines, inline: true });
    }

    return interaction.reply({ embeds: [embed] });
  },
};
