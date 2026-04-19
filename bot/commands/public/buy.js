// commands/public/buy.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Products, Variants, Keys } = require("../../utils/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Purchase a product from the store")
    .addStringOption(opt =>
      opt.setName("product").setDescription("The product you want to buy").setRequired(true).setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const products = Products.getAll();
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = products
      .filter(p => p.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(p => ({ name: p.name, value: p.id }));
    await interaction.respond(choices);
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const productId = interaction.options.getString("product");
    const product = Products.getById(productId);
    if (!product) return interaction.editReply({ content: "Product not found." });

    const variants = Variants.getByProduct(productId);
    const totalStock = variants.reduce((sum, v) => sum + Keys.stock(v.id), 0);

    if (totalStock === 0) {
      return interaction.editReply({ content: `**${product.name}** is out of stock. We'll post a restock alert when it's back!` });
    }

    const checkoutUrl = `${process.env.BASE_URL}/?product=${productId}`;

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle(product.name)
      .setDescription(product.description)
      .setThumbnail(product.image_url || null)
      .addFields(
        {
          name: "Available Plans",
          value: variants.map(v => {
            const s = Keys.stock(v.id);
            const icon = s === 0 ? "🔴" : s <= 5 ? "🟡" : "🟢";
            return `${icon} **${v.name}** — $${Number(v.price).toFixed(2)} (${s} in stock)`;
          }).join("\n"),
        },
        { name: "⚡ Delivery", value: "Instant — key sent to your DMs", inline: true }
      )
      .setFooter({ text: "NexusKeys • Secured by Stripe" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Go to Store")
        .setStyle(ButtonStyle.Link)
        .setURL(checkoutUrl)
        .setEmoji("🛒")
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
