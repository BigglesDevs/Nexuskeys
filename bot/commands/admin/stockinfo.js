// commands/admin/stockinfo.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { Products, Variants, Keys, Orders } = require("../../utils/db");
const { isAdmin } = require("../../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stockinfo")
    .setDescription("[ADMIN] View detailed stock and revenue overview")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isAdmin(interaction)) return interaction.reply({ content: "No permission.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    const products = Products.getAllAdmin();
    const stats = Orders.getStats();

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle("📊 Admin Stock Overview")
      .addFields(
        { name: "💰 Total Revenue", value: `$${Number(stats.total_revenue || 0).toFixed(2)}`, inline: true },
        { name: "📅 Today's Revenue", value: `$${Number(stats.today_revenue || 0).toFixed(2)}`, inline: true },
        { name: "🧾 Total Orders", value: `${stats.total_orders}`, inline: true }
      )
      .setTimestamp();

    for (const p of products) {
      const variants = Variants.getByProduct(p.id);
      if (!variants.length) continue;
      const lines = variants.map(v => {
        const s = Keys.stock(v.id);
        const icon = s === 0 ? "🔴" : s <= 5 ? "🟡" : "🟢";
        return `${icon} ${v.name} — **${s}** keys @ $${Number(v.price).toFixed(2)}`;
      }).join("\n");
      embed.addFields({ name: `${p.active ? "✅" : "❌"} ${p.name}`, value: lines, inline: false });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
