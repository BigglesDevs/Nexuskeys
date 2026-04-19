// events/ready.js
module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`✅ NexusKeys Bot ready as ${client.user.tag}`);
    client.user.setActivity("nexuskeys.gg | /products", { type: 3 }); // WATCHING
  },
};
