// commands/public/products.js
const { SlashCommandBuilder } = require("discord.js");
const { Products, Variants, Keys } = require("../../utils/db");
const { productsEmbed, buyButton } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("products")
    .setDescription("Browse all available products in the NexusKeys store"),

  async execute(interaction) {
    await interaction.deferReply();
    const products = Products.getAll();

    if (!products.length) {
      return interaction.editReply({ content: "No products available right now. Check back soon!" });
    }

    const stockMap = {};
    for (const p of products) {
      const variants = Variants.getByProduct(p.id);
      stockMap[p.id] = variants.reduce((sum, v) => sum + Keys.stock(v.id), 0);
    }

    const embed = productsEmbed(products, stockMap);
    const rows = products.slice(0, 5).map(p => buyButton(p.id, `Buy ${p.name}`));

    return interaction.editReply({ embeds: [embed], components: rows.slice(0, 5) });
  },
};
