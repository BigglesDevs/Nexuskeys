// commands/admin/addkeys.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { Products, Variants, Keys } = require("../../utils/db");
const { isAdmin } = require("../../utils/helpers");
const { restockEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addkeys")
    .setDescription("[ADMIN] Add keys to a product variant")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName("product").setDescription("Product").setRequired(true).setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt.setName("variant").setDescription("Variant e.g. 1 Day, Lifetime").setRequired(true).setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt.setName("keys").setDescription("Keys separated by commas or newlines").setRequired(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === "product") {
      const products = Products.getAll();
      const val = focused.value.toLowerCase();
      await interaction.respond(
        products.filter(p => p.name.toLowerCase().includes(val)).slice(0, 25)
          .map(p => ({ name: p.name, value: p.id }))
      );
    } else if (focused.name === "variant") {
      const productId = interaction.options.getString("product");
      if (!productId) return interaction.respond([]);
      const variants = Variants.getByProduct(productId);
      const val = focused.value.toLowerCase();
      await interaction.respond(
        variants.filter(v => v.name.toLowerCase().includes(val)).slice(0, 25)
          .map(v => ({ name: `${v.name} — $${v.price} (${Keys.stock(v.id)} keys)`, value: v.id }))
      );
    }
  },

  async execute(interaction) {
    if (!isAdmin(interaction)) return interaction.reply({ content: "No permission.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    const productId = interaction.options.getString("product");
    const variantId = interaction.options.getString("variant");
    const keysRaw = interaction.options.getString("keys");

    const product = Products.getById(productId);
    const variant = Variants.getById(variantId);
    if (!product || !variant) return interaction.editReply({ content: "Product or variant not found." });

    const keyList = keysRaw.split(/[\n,]+/).map(k => k.trim()).filter(Boolean);
    const added = Keys.addBulk(productId, variantId, keyList);
    const newTotal = Keys.stock(variantId);

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("✅ Keys Added")
      .addFields(
        { name: "Product", value: product.name, inline: true },
        { name: "Variant", value: variant.name, inline: true },
        { name: "Keys Added", value: `+${added}`, inline: true },
        { name: "New Total", value: `${newTotal}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Send restock alert
    const restockChannelId = process.env.DISCORD_RESTOCK_CHANNEL;
    if (restockChannelId) {
      try {
        const ch = await interaction.client.channels.fetch(restockChannelId);
        await ch.send({ embeds: [restockEmbed(product, added, newTotal)] });
      } catch (_) {}
    }
  },
};
