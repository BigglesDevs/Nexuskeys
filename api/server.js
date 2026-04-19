require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const morgan = require("morgan");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const Stripe = require("stripe");

const { Products, Variants, Keys, Orders, Users } = require("../shared/db");
const { purchaseSuccessEmbed } = require("../shared/embeds");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");
const app = express();

// ── Stripe webhook needs raw body ─────────────────────────────────────────────
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);

// ── Core middleware ───────────────────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(morgan("dev"));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "nexuskeys-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// ── Static files ──────────────────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, "../dashboard/public");
console.log("Static dir:", PUBLIC_DIR, "| exists:", fs.existsSync(PUBLIC_DIR));
app.use(express.static(PUBLIC_DIR));

// ── Auth middleware ───────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
  if (!req.session.user.is_admin) return res.status(403).json({ error: "Admin only" });
  next();
};

// ── Discord OAuth ─────────────────────────────────────────────────────────────
app.get("/auth/discord", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: `${process.env.BASE_URL}/auth/discord/callback`,
    response_type: "code",
    scope: "identify email",
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

app.get("/auth/discord/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect("/?error=no_code");
  try {
    const tokenRes = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.BASE_URL}/auth/discord/callback`,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const { access_token, refresh_token } = tokenRes.data;
    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const d = userRes.data;
    const user = Users.upsert({
      discord_id: d.id,
      username: d.username,
      avatar: d.avatar
        ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`,
      access_token,
      refresh_token,
    });
    req.session.user = user;
    req.session.save(() => res.redirect("/"));
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.redirect("/?error=oauth_failed");
  }
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.json(null);
  const { access_token, refresh_token, ...safe } = req.session.user;
  res.json(safe);
});

// ── Products ──────────────────────────────────────────────────────────────────
app.get("/api/products", (req, res) => {
  const products = Products.getAll().map(p => ({
    ...p,
    variants: Variants.getByProduct(p.id).map(v => ({ ...v, stock: Keys.stock(v.id) })),
  }));
  res.json(products);
});

// ── Checkout ──────────────────────────────────────────────────────────────────
app.post("/api/checkout", requireAuth, async (req, res) => {
  const { product_id, variant_id } = req.body;
  const product = Products.getById(product_id);
  const variant = Variants.getById(variant_id);
  if (!product || !variant) return res.status(404).json({ error: "Not found" });
  if (Keys.stock(variant_id) === 0) return res.status(400).json({ error: "Out of stock" });

  try {
    const sess = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `${product.name} — ${variant.name}`,
            description: product.description,
            ...(product.image_url ? { images: [product.image_url] } : {}),
          },
          unit_amount: Math.round(variant.price * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${process.env.BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/`,
      metadata: {
        product_id: product.id,
        variant_id: variant.id,
        discord_id: req.session.user.discord_id,
        discord_username: req.session.user.username,
      },
    });

    Orders.create({
      discord_id: req.session.user.discord_id,
      discord_username: req.session.user.username,
      product_id: product.id,
      product_name: product.name,
      variant_id: variant.id,
      variant_name: variant.name,
      amount: variant.price,
      stripe_session_id: sess.id,
    });

    res.json({ url: sess.url });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res.status(500).json({ error: "Payment failed" });
  }
});

// ── Stripe Webhook ────────────────────────────────────────────────────────────
async function handleStripeWebhook(req, res) {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const order = Orders.getBySession(session.id);
    if (!order || order.status === "completed") return res.json({ received: true });

    const product = Products.getById(order.product_id);
    const keyValue = Keys.claimAndDelete(order.variant_id);

    if (!keyValue) {
      Orders.fail(order.id);
      return res.json({ received: true });
    }

    const completedOrder = Orders.complete(order.id, {
      stripe_payment_id: session.payment_intent,
      key_value: keyValue,
    });

    try {
      const { dmUser, sendPurchaseLog } = require("../bot/bot");
      await dmUser(order.discord_id, [purchaseSuccessEmbed(completedOrder, product)]);
      await sendPurchaseLog(completedOrder, product);
    } catch (err) {
      console.error("Discord notify failed:", err.message);
    }
  }

  res.json({ received: true });
}

// ── User orders ───────────────────────────────────────────────────────────────
app.get("/api/orders/mine", requireAuth, (req, res) => {
  res.json(Orders.getByUser(req.session.user.discord_id));
});

// ── Admin ─────────────────────────────────────────────────────────────────────
app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const products = Products.getAllAdmin().map(p => ({
    ...p,
    variants: Variants.getByProduct(p.id).map(v => ({ ...v, stock: Keys.stock(v.id) })),
  }));
  res.json({ stats: Orders.getStats(), products, recentOrders: Orders.getRecent(20) });
});

app.post("/api/admin/products", requireAdmin, (req, res) => {
  const { name, description, category, image_url } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  res.json(Products.create({ name, description, category, image_url }));
});

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  Products.delete(req.params.id);
  res.json({ ok: true });
});

app.post("/api/admin/products/:id/variants", requireAdmin, (req, res) => {
  const { name, price, sort_order } = req.body;
  if (!name || !price) return res.status(400).json({ error: "name and price required" });
  res.json(Variants.create({ product_id: req.params.id, name, price, sort_order }));
});

app.post("/api/admin/variants/:id/keys", requireAdmin, (req, res) => {
  const { keys } = req.body;
  if (!Array.isArray(keys) || !keys.length) return res.status(400).json({ error: "keys array required" });
  const variant = Variants.getById(req.params.id);
  if (!variant) return res.status(404).json({ error: "Variant not found" });
  const added = Keys.addBulk(variant.product_id, variant.id, keys);
  res.json({ added, stock: Keys.stock(variant.id) });
});

app.get("/api/admin/variants/:id/keys", requireAdmin, (req, res) => {
  res.json(Keys.listByVariant(req.params.id));
});

app.delete("/api/admin/keys/:id", requireAdmin, (req, res) => {
  Keys.deleteById(req.params.id);
  res.json({ ok: true });
});

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  res.json(Orders.getRecent(100));
});

// ── Catch all → SPA ───────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NexusKeys API running on port ${PORT}`));

module.exports = app;
