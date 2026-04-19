const { SlashCommandBuilder } = require("discord.js");
const { Products, Variants, Keys } = require("../../utils/db");
const { productsEmbed, buyButton } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("products").setDescription("Browse all products"),
  async execute(interaction) {
    await interaction.deferReply();
    const products = Products.getAll();
    if (!products.length) return interaction.editReply({ content: "No products available right now." });
    const stockMap = {};
    for (const p of products) {
      const variants = Variants.getByProduct(p.id);
      stockMap[p.id] = variants.reduce((s, v) => s + Keys.stock(v.id), 0);
    }
    return interaction.editReply({ embeds: [productsEmbed(products, stockMap)] });
  },
};
