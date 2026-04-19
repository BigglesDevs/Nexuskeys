// shared/embeds.js — Reusable Discord embed builders
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const COLORS = {
  brand:   0x5865F2, // Discord blurple
  success: 0x22c55e,
  error:   0xef4444,
  warning: 0xf59e0b,
  info:    0x3b82f6,
  nexus:   0x8b5cf6, // NexusKeys purple
};

// ─── Purchase Success Embed ───────────────────────────────────────────────────
function purchaseSuccessEmbed(order, product) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setAuthor({ name: "NexusKeys", iconURL: "https://i.imgur.com/oBzHkYt.png" })
    .setTitle(`${product.image_emoji} Order Confirmed — ${product.name}`)
    .setDescription(
      `> Thank you for your purchase, <@${order.discord_id}>!\n> Your license key is ready below.`
    )
    .addFields(
      { name: "🔑 License Key", value: `\`\`\`${order.key_value}\`\`\``, inline: false },
      { name: "📦 Product", value: product.name, inline: true },
      { name: "💳 Amount Paid", value: `$${order.amount.toFixed(2)}`, inline: true },
      { name: "🧾 Order ID", value: order.id, inline: true }
    )
    .setFooter({ text: "NexusKeys • Open a ticket if you need support" })
    .setTimestamp();
}

// ─── Purchase Log Embed (for staff channel) ───────────────────────────────────
function purchaseLogEmbed(order, product) {
  return new EmbedBuilder()
    .setColor(COLORS.nexus)
    .setTitle("💰 New Purchase")
    .addFields(
      { name: "Customer", value: `<@${order.discord_id}> (${order.discord_username})`, inline: true },
      { name: "Product", value: `${product.image_emoji} ${product.name}`, inline: true },
      { name: "Amount", value: `$${order.amount.toFixed(2)}`, inline: true },
      { name: "Order ID", value: order.id, inline: true },
      { name: "Payment ID", value: order.stripe_payment_id || "N/A", inline: true },
      { name: "Status", value: "✅ Completed", inline: true }
    )
    .setTimestamp();
}

// ─── Restock Embed ────────────────────────────────────────────────────────────
function restockEmbed(product, keysAdded, newTotal) {
  return new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle(`📦 Restock Alert — ${product.image_emoji} ${product.name}`)
    .setDescription(`**${product.name}** has been restocked and is now available!`)
    .addFields(
      { name: "Keys Added", value: `+${keysAdded}`, inline: true },
      { name: "Total Stock", value: `${newTotal}`, inline: true },
      { name: "Price", value: `$${product.price.toFixed(2)}`, inline: true }
    )
    .setFooter({ text: "NexusKeys • Use /buy to purchase" })
    .setTimestamp();
}

// ─── Product List Embed ───────────────────────────────────────────────────────
function productsEmbed(products, stockMap) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.nexus)
    .setAuthor({ name: "NexusKeys Store", iconURL: "https://i.imgur.com/oBzHkYt.png" })
    .setTitle("🛒 Available Products")
    .setDescription("Browse our latest software keys and licenses. Use `/buy <product>` to purchase.");

  for (const p of products) {
    const stock = stockMap[p.id] ?? 0;
    const stockStr = stock === 0
      ? "❌ Out of Stock"
      : stock <= 5
      ? `⚠️ Low Stock (${stock})`
      : `✅ ${stock} in stock`;

    embed.addFields({
      name: `${p.image_emoji} ${p.name}`,
      value: `${p.description}\n**Price:** $${p.price.toFixed(2)} • ${stockStr}`,
      inline: false,
    });
  }

  embed.setFooter({ text: `${products.length} products • NexusKeys` }).setTimestamp();
  return embed;
}

// ─── Ticket Open Embed ────────────────────────────────────────────────────────
function ticketOpenEmbed(ticket, user) {
  return new EmbedBuilder()
    .setColor(COLORS.brand)
    .setTitle(`🎫 Support Ticket — ${ticket.id}`)
    .setDescription(
      `Welcome, <@${ticket.discord_id}>!\n\nA staff member will be with you shortly.\nPlease describe your issue in detail below.`
    )
    .addFields(
      { name: "Subject", value: ticket.subject, inline: true },
      { name: "Ticket ID", value: ticket.id, inline: true },
      { name: "Order ID", value: ticket.order_id || "None linked", inline: true }
    )
    .setFooter({ text: "NexusKeys Support • Click Close Ticket when resolved" })
    .setTimestamp();
}

// ─── Ticket Close Embed ───────────────────────────────────────────────────────
function ticketCloseEmbed(ticket) {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle("🔒 Ticket Closed")
    .setDescription(`Ticket **${ticket.id}** has been closed.\nThank you for reaching out to NexusKeys support!`)
    .setTimestamp();
}

// ─── Error Embed ──────────────────────────────────────────────────────────────
function errorEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle("❌ Error")
    .setDescription(message)
    .setTimestamp();
}

// ─── Button Rows ──────────────────────────────────────────────────────────────
function buyButton(productId, label = "Buy Now") {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(label)
      .setStyle(ButtonStyle.Link)
      .setURL(`${process.env.BASE_URL}/checkout/${productId}`)
      .setEmoji("🛒")
  );
}

function closeTicketButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );
}

module.exports = {
  purchaseSuccessEmbed,
  purchaseLogEmbed,
  restockEmbed,
  productsEmbed,
  ticketOpenEmbed,
  ticketCloseEmbed,
  errorEmbed,
  buyButton,
  closeTicketButton,
  COLORS,
};
