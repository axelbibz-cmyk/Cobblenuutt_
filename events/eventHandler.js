// handlers/eventHandler.js
const fs = require("fs");
const path = require("path");

function loadEvents(client) {
  const eventsPath = path.join(__dirname, "..", "events");

  const categories = fs.readdirSync(eventsPath);
  for (const category of categories) {
    const eventFiles = fs.readdirSync(path.join(eventsPath, category)).filter(file => file.endsWith(".js"));

    for (const file of eventFiles) {
      const event = require(path.join(eventsPath, category, file));

      if (!event.name || !event.execute) {
        console.log(`⚠️ Fichier ${file} ignoré : il manque "name" ou "execute".`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      console.log(`✅ Événement chargé : ${event.name} (${category}/${file})`);
    }
  }
}

module.exports = { loadEvents };
