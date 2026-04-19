// commands/admin/addproduct.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { Products, Variants } = require("../../utils/db");
const { isAdmin } = require("../../utils/helpers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addproduct")
    .setDescription("[ADMIN] Add a new product to the store")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName("name").setDescription("Product name").setRequired(true))
    .addStringOption(opt => opt.setName("description").setDescription("Product description").setRequired(true))
    .addStringOption(opt => opt.setName("category").setDescription("Category e.g. Software").setRequired(false))
    .addStringOption(opt => opt.setName("image").setDescription("Image URL for thumbnail").setRequired(false)),

  async execute(interaction) {
    if (!isAdmin(interaction)) return interaction.reply({ content: "No permission.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    const product = Products.create({
      name:        interaction.options.getString("name"),
      description: interaction.options.getString("description"),
      category:    interaction.options.getString("category") || "General",
      image_url:   interaction.options.getString("image") || "",
    });

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("✅ Product Created")
      .setDescription(`**${product.name}** added to the store.\nUse \`/addvariant\` to add pricing plans, then \`/addkeys\` to add stock.`)
      .addFields(
        { name: "Category", value: product.category, inline: true },
        { name: "Product ID", value: `\`${product.id}\``, inline: false }
      );

    return interaction.editReply({ embeds: [embed] });
  },
};
