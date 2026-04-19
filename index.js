require("dotenv").config();

console.log("╔══════════════════════════════════╗");
console.log("║     NexusKeys Platform v1.0      ║");
console.log("╚══════════════════════════════════╝");

require("./bot/bot");

setTimeout(() => {
  require("./api/server");
}, 2000);
