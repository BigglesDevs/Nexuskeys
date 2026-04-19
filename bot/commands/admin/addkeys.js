const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { Products, Variants, Keys } = require("../../utils/db");
const { isAdmin } = require("../../utils/helpers");
const { restockEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addkeys")
    .setDescription("[ADMIN] Add keys to a product variant")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName("product").setDescription("Product").setRequired(true).setAutocomplete(true))
    .addStringOption(opt => opt.setName("variant").setDescription("Variant").setRequired(true).setAutocomplete(true))
    .addStringOption(opt => opt.setName("keys").setDescription("Keys comma or newline separated").setRequired(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === "product") {
      const products = Products.getAll();
      await interaction.respond(
        products.filter(p => p.name.toLowerCase().includes(focused.value.toLowerCase())).slice(0, 25)
          .map(p => ({ name: p.name, value: p.id }))
      );
    } else if (focused.name === "variant") {
      const productId = interaction.options.getString("product");
      if (!productId) return interaction.respond([]);
      const variants = Variants.getByProduct(productId);
      await interaction.respond(
        variants.filter(v => v.name.toLowerCase().includes(focused.value.toLowerCase())).slice(0, 25)
          .map(v => ({ name: `${v.name} — $${v.price} (${Keys.stock(v.id)} keys)`, value: v.id }))
      );
    }
  },

  async execute(interaction) {
    if (!isAdmin(interaction)) return interaction.reply({ content: "No permission.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const product = Products.getById(interaction.options.getString("product"));
    const variant = Variants.getById(interaction.options.getString("variant"));
    if (!product || !variant) return interaction.editReply({ content: "Product or variant not found." });
    const keyList = interaction.options.getString("keys").split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
    const added = Keys.addBulk(product.id, variant.id, keyList);
    const newTotal = Keys.stock(variant.id);
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0x22c55e).setTitle("✅ Keys Added")
        .addFields(
          { name: "Product", value: product.name, inline: true },
          { name: "Variant", value: variant.name, inline: true },
          { name: "Added", value: `+${added}`, inline: true },
          { name: "Total Stock", value: `${newTotal}`, inline: true }
        )],
    });
    const ch = process.env.DISCORD_RESTOCK_CHANNEL;
    if (ch) {
      try {
        const channel = await interaction.client.channels.fetch(ch);
        await channel.send({ embeds: [restockEmbed(product, added, newTotal)] });
      } catch (_) {}
    }
  },
};
