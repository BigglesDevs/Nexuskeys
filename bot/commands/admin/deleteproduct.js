const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { Products } = require("../../utils/db");
const { isAdmin } = require("../../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deleteproduct")
    .setDescription("[ADMIN] Remove a product")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName("product").setDescription("Product to remove").setRequired(true).setAutocomplete(true)),

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
    const product = Products.getById(interaction.options.getString("product"));
    if (!product) return interaction.reply({ content: "Product not found.", ephemeral: true });
    Products.delete(product.id);
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xef4444).setTitle("🗑️ Product Removed")
        .setDescription(`**${product.name}** has been removed.`)],
      ephemeral: true,
    });
  },
};
