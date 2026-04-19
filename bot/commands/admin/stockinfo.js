const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { Products, Variants, Keys, Orders } = require("../../utils/db");
const { isAdmin } = require("../../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stockinfo")
    .setDescription("[ADMIN] View stock and revenue overview")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isAdmin(interaction)) return interaction.reply({ content: "No permission.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const stats = Orders.getStats();
    const embed = new EmbedBuilder().setColor(0x6366f1).setTitle("📊 Admin Overview")
      .addFields(
        { name: "💰 Total Revenue", value: `$${Number(stats.total_revenue||0).toFixed(2)}`, inline: true },
        { name: "📅 Today", value: `$${Number(stats.today_revenue||0).toFixed(2)}`, inline: true },
        { name: "🧾 Orders", value: `${stats.total_orders}`, inline: true }
      ).setTimestamp();
    for (const p of Products.getAllAdmin()) {
      const variants = Variants.getByProduct(p.id);
      if (!variants.length) continue;
      embed.addFields({
        name: p.name,
        value: variants.map(v => `${Keys.stock(v.id)===0?"🔴":Keys.stock(v.id)<=5?"🟡":"🟢"} ${v.name} — **${Keys.stock(v.id)}** keys @ $${Number(v.price).toFixed(2)}`).join("\n"),
        inline: false,
      });
    }
    return interaction.editReply({ embeds: [embed] });
  },
};
