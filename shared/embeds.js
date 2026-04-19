const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function purchaseSuccessEmbed(order, product) {
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle(`✅ Order Confirmed — ${product.name}`)
    .setDescription(`Thank you for your purchase, <@${order.discord_id}>!`)
    .addFields(
      { name: "🔑 License Key", value: `\`\`\`${order.key_value}\`\`\``, inline: false },
      { name: "📦 Product", value: `${product.name}${order.variant_name ? ` — ${order.variant_name}` : ""}`, inline: true },
      { name: "💳 Amount", value: `$${Number(order.amount).toFixed(2)}`, inline: true },
      { name: "🧾 Order ID", value: order.id, inline: true }
    )
    .setFooter({ text: "NexusKeys • Open a ticket if you need support" })
    .setTimestamp();

  // Build buttons row
  const buttons = [];

  if (product.docs_url) {
    buttons.push(
      new ButtonBuilder()
        .setLabel("📖 How to Install")
        .setStyle(ButtonStyle.Link)
        .setURL(product.docs_url)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setLabel("🎫 Open Ticket")
      .setStyle(ButtonStyle.Link)
      .setURL(`${process.env.BASE_URL}`)
  );

  const row = new ActionRowBuilder().addComponents(buttons);
  return { embeds: [embed], components: [row] };
}

function purchaseLogEmbed(order, product) {
  return new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle("💰 New Purchase")
    .addFields(
      { name: "Customer", value: `<@${order.discord_id}> (${order.discord_username})`, inline: true },
      { name: "Product", value: `${product.name}${order.variant_name ? ` — ${order.variant_name}` : ""}`, inline: true },
      { name: "Amount", value: `$${Number(order.amount).toFixed(2)}`, inline: true },
      { name: "Order ID", value: order.id, inline: true },
      { name: "Status", value: "✅ Completed", inline: true }
    )
    .setTimestamp();
}

function restockEmbed(product, keysAdded, newTotal) {
  return new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle(`📦 Restock — ${product.name}`)
    .setDescription(`**${product.name}** has been restocked!`)
    .addFields(
      { name: "Keys Added", value: `+${keysAdded}`, inline: true },
      { name: "Total Stock", value: `${newTotal}`, inline: true }
    )
    .setFooter({ text: "NexusKeys • Use /buy to purchase" })
    .setTimestamp();
}

function productsEmbed(products, stockMap) {
  const embed = new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle("🛒 NexusKeys Store")
    .setDescription("Use `/buy` to purchase any product.");
  for (const p of products) {
    const stock = stockMap[p.id] ?? 0;
    const stockStr = stock === 0 ? "❌ Out of Stock" : stock <= 5 ? `⚠️ Low (${stock})` : `✅ ${stock} in stock`;
    embed.addFields({ name: p.name, value: `${p.description}\n${stockStr}`, inline: false });
  }
  return embed;
}

function ticketOpenEmbed(ticket) {
  return new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle(`🎫 Ticket — ${ticket.id}`)
    .setDescription(`Welcome <@${ticket.discord_id}>! A staff member will be with you shortly.\n\nPlease describe your issue below.`)
    .addFields({ name: "Subject", value: ticket.subject, inline: true })
    .setFooter({ text: "NexusKeys Support • Click Close Ticket when resolved" })
    .setTimestamp();
}

function ticketCloseEmbed(ticket) {
  return new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("🔒 Ticket Closed")
    .setDescription(`Ticket **${ticket.id}** has been closed. Thanks for reaching out!`)
    .setTimestamp();
}

function buyButton(productId, label) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(label || "Buy Now")
      .setStyle(ButtonStyle.Link)
      .setURL(`${process.env.BASE_URL}`)
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
  purchaseSuccessEmbed, purchaseLogEmbed, restockEmbed,
  productsEmbed, ticketOpenEmbed, ticketCloseEmbed,
  buyButton, closeTicketButton,
};
