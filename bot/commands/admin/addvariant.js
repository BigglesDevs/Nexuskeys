const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { Products, Variants } = require("../../utils/db");
const { isAdmin } = require("../../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addvariant")
    .setDescription("[ADMIN] Add a pricing variant to a product")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName("product").setDescription("Product").setRequired(true).setAutocomplete(true))
    .addStringOption(opt => opt.setName("name").setDescription("e.g. 1 Day, 1 Week, Lifetime").setRequired(true))
    .addNumberOption(opt => opt.setName("price").setDescription("Price in USD").setRequired(true)),

  async autocomplete(interaction) {
    const products = Products.getAll();
    const focused = interaction.options.getFocused().toLowerCase();
    await interaction.respond(
      products.filter(p => p.name.toLowerCase().includes(focused)).slice(0, 25)
        .map(p => ({ name: p.name, value: p.id }))
    );
  },

  async execute(interaction) {
    if (!isAdmin(interaction)) return interaction.reply({ content: "No permission.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const product = Products.getById(interaction.options.getString("product"));
    if (!product) return interaction.editReply({ content: "Product not found." });
    const variant = Variants.create({
      product_id: product.id,
      name: interaction.options.getString("name"),
      price: interaction.options.getNumber("price"),
    });
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0x22c55e).setTitle("✅ Variant Added")
        .addFields(
          { name: "Product", value: product.name, inline: true },
          { name: "Variant", value: variant.name, inline: true },
          { name: "Price", value: `$${Number(variant.price).toFixed(2)}`, inline: true },
          { name: "Next", value: "Use `/addkeys` to add stock", inline: false }
        )],
    });
  },
};
