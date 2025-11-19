const fs = require("fs");
const path = require("path");

function loadEvents(client) {
  const eventsPath = path.join(__dirname); // Dossier events/ lui-même

  const eventFiles = fs.readdirSync(eventsPath).filter(file => 
    file.endsWith(".js") && file !== "eventHandler.js"
  );

  for (const file of eventFiles) {
    try {
      const event = require(path.join(eventsPath, file));

      if (!event.name || !event.execute) {
        console.log(`⚠️ Fichier ${file} ignoré : il manque "name" ou "execute".`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      console.log(`✅ Événement chargé : ${event.name} (${file})`);
    } catch (error) {
      console.error(`❌ Erreur chargement ${file}:`, error.message);
    }
  }
}

module.exports = { loadEvents };
