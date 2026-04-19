// index.js — NexusKeys entry point
// Starts the Discord bot + Express API in one process (ideal for Railway)
require("dotenv").config();

console.log("╔══════════════════════════════════╗");
console.log("║     NexusKeys Platform v1.0      ║");
console.log("╚══════════════════════════════════╝");

// Start bot first so it's ready before API tries to use it
require("./bot/bot");

// Small delay to let bot login before API starts
setTimeout(() => {
  require("./api/server");
}, 2000);
