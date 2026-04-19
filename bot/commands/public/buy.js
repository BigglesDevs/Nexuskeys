const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Products, Variants, Keys } = require("../../utils/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Purchase a product")
    .addStringOption(opt => opt.setName("product").setDescription("Product to buy").setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const products = Products.getAll();
    const focused = interaction.options.getFocused().toLowerCase();
    await interaction.respond(
      products.filter(p => p.name.toLowerCase().includes(focused)).slice(0, 25)
        .map(p => ({ name: p.name, value: p.id }))
    );
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const productId = interaction.options.getString("product");
    const product = Products.getById(productId);
    if (!product) return interaction.editReply({ content: "Product not found." });

    const variants = Variants.getByProduct(productId);
    const totalStock = variants.reduce((s, v) => s + Keys.stock(v.id), 0);
    if (totalStock === 0) return interaction.editReply({ content: `**${product.name}** is out of stock!` });

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle(product.name)
      .setDescription(product.description || "Premium software license.")
      .addFields({
        name: "Available Plans",
        value: variants.map(v => {
          const s = Keys.stock(v.id);
          return `${s === 0 ? "🔴" : s <= 5 ? "🟡" : "🟢"} **${v.name}** — $${Number(v.price).toFixed(2)} (${s} in stock)`;
        }).join("\n"),
      })
      .setFooter({ text: "NexusKeys • Secured by Stripe" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Go to Store")
        .setStyle(ButtonStyle.Link)
        .setURL(process.env.BASE_URL)
        .setEmoji("🛒")
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
