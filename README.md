# ⬡ NexusKeys — Software Key Reseller Platform

A full-stack software key reselling platform with Discord bot, web storefront, Stripe payments, and admin dashboard. Deploy to Railway in minutes.

---

## ✨ Features

### Discord Bot
- `/products` — Browse all products with live stock + buy buttons
- `/buy <product>` — Get a Stripe checkout link directly in Discord
- `/orders` — View personal order history with keys
- `/stock` — Live stock levels for all products
- `/ticket` — Opens a private support channel with close button
- `/addproduct` *(admin)* — Create a product from Discord
- `/addkeys` *(admin)* — Upload keys to any product via Discord
- `/stockinfo` *(admin)* — Revenue + full stock overview
- `/deleteproduct` *(admin)* — Remove a product

### Web Storefront
- Discord OAuth login
- Product grid with category filters + search
- Stripe Checkout (hosted, PCI compliant)
- Live purchase ticker
- Order history with key reveal

### Admin Dashboard
- Revenue stats + order table
- Add/remove products
- Upload keys (bulk paste)
- Discord bot config guide

### Automations
- Key delivered to Discord DMs instantly after payment
- Purchase embed sent to your log channel
- Restock alert sent to restock channel when you `/addkeys`
- Stripe webhook handles fulfillment — zero manual work

---

## 🚀 Deploy to Railway

### 1. Create a Discord Application
1. Go to https://discord.com/developers/applications → New Application → name it **NexusKeys**
2. **Bot tab** → Add Bot → copy the **Bot Token**
3. **OAuth2 tab** → copy **Client ID** and **Client Secret**
4. Add redirect URL: `https://YOUR-APP.up.railway.app/auth/discord/callback`
5. **Bot tab** → enable **Server Members Intent** and **Message Content Intent**
6. Invite bot to your server with scopes: `bot applications.commands` and permissions: `Manage Channels`, `Send Messages`, `Embed Links`, `Read Message History`

### 2. Get Your Discord IDs
Enable Developer Mode in Discord settings, then right-click to copy:
- Your **User ID** (for `ADMIN_DISCORD_ID`)
- Your **Server ID** (for `DISCORD_GUILD_ID`)
- A **#purchase-logs** channel ID
- A **#restock-alerts** channel ID
- A **Tickets** category ID (create a category called Tickets)

### 3. Set Up Stripe
1. https://dashboard.stripe.com → create account
2. Copy **Secret Key** (`sk_test_...`) and **Publishable Key** (`pk_test_...`)
3. After deploying, go to Stripe → Webhooks → Add endpoint:
   - URL: `https://YOUR-APP.up.railway.app/webhooks/stripe`
   - Event: `checkout.session.completed`
   - Copy the **Webhook Secret** (`whsec_...`)

### 4. Deploy to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Or connect your GitHub repo at https://railway.app

### 5. Set Environment Variables in Railway
Go to your Railway project → Variables → add all from `.env.example`:

| Variable | Value |
|---|---|
| `DISCORD_TOKEN` | Bot token from step 1 |
| `DISCORD_CLIENT_ID` | Application Client ID |
| `DISCORD_CLIENT_SECRET` | Application Client Secret |
| `DISCORD_GUILD_ID` | Your server ID |
| `DISCORD_PURCHASE_LOG_CHANNEL` | #purchase-logs channel ID |
| `DISCORD_RESTOCK_CHANNEL` | #restock-alerts channel ID |
| `DISCORD_TICKET_CATEGORY` | Tickets category ID |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (after deploying) |
| `BASE_URL` | `https://your-app.up.railway.app` |
| `SESSION_SECRET` | Any random 32+ char string |
| `ADMIN_DISCORD_ID` | Your personal Discord user ID |

### 6. Deploy Slash Commands
Once your Railway app is running:
```bash
# Locally with your .env filled in
node bot/deploy-commands.js
```
Commands will appear in your Discord server within a few seconds.

---

## 📁 Project Structure

```
nexuskeys/
├── index.js                 # Entry point — starts bot + API
├── package.json
├── railway.toml             # Railway config
├── .env.example             # Copy to .env for local dev
│
├── bot/
│   ├── bot.js               # Discord bot — all slash commands
│   └── deploy-commands.js   # One-time command registration
│
├── api/
│   └── server.js            # Express API + Stripe webhook
│
├── shared/
│   ├── db.js                # SQLite database (Products, Keys, Orders, Tickets, Users)
│   └── embeds.js            # Discord embed builders
│
└── dashboard/
    └── public/
        ├── index.html       # Full SPA — storefront + dashboard
        └── success.html     # Post-payment success page
```

---

## 💻 Local Development

```bash
# 1. Clone and install
npm install

# 2. Copy env file and fill it in
cp .env.example .env

# 3. Deploy slash commands (once)
node bot/deploy-commands.js

# 4. Start dev server
npm run dev
```

App runs at http://localhost:3000

---

## 📝 Adding Products & Keys

**Via Discord (easiest):**
```
/addproduct name:Windows 11 Pro price:14.99 description:Genuine license emoji:💻
/addkeys product:Windows 11 Pro keys:XXXXX-XXXXX,YYYYY-YYYYY
```

**Via Dashboard:**
1. Login → Dashboard → Add Product
2. Dashboard → Add Keys → paste keys one per line

---

## 🔒 Security Notes

- Keys are only revealed in Discord DMs after successful Stripe payment
- Stripe webhook signature verified on every event
- Admin routes protected by Discord user ID check
- Sessions are HTTP-only cookies

---

## Going Live (Stripe Live Mode)

1. In Stripe dashboard, switch to **Live mode**
2. Replace `sk_test_` keys with `sk_live_` keys in Railway variables
3. Create a new webhook for the live endpoint
4. Update `STRIPE_WEBHOOK_SECRET` with the live webhook secret
