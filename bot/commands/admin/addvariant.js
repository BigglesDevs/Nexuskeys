// commands/admin/addvariant.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { Products, Variants, Keys } = require("../../utils/db");
const { isAdmin } = require("../../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addvariant")
    .setDescription("[ADMIN] Add a pricing variant to a product (e.g. 1 Day, 1 Week, Lifetime)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName("product").setDescription("Product to add variant to").setRequired(true).setAutocomplete(true)
    )
    .addStringOption(opt => opt.setName("name").setDescription("Variant name e.g. 1 Day, 1 Week, Lifetime").setRequired(true))
    .addNumberOption(opt => opt.setName("price").setDescription("Price in USD e.g. 4.99").setRequired(true)),

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

    const productId = interaction.options.getString("product");
    const product = Products.getById(productId);
    if (!product) return interaction.editReply({ content: "Product not found." });

    const variant = Variants.create({
      product_id: productId,
      name: interaction.options.getString("name"),
      price: interaction.options.getNumber("price"),
    });

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("✅ Variant Added")
      .addFields(
        { name: "Product", value: product.name, inline: true },
        { name: "Variant", value: variant.name, inline: true },
        { name: "Price", value: `$${Number(variant.price).toFixed(2)}`, inline: true },
        { name: "Next Step", value: `Use \`/addkeys\` to add stock to this variant`, inline: false }
      );

    return interaction.editReply({ embeds: [embed] });
  },
};
