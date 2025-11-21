const fs = require("fs");
const path = require("path");

function loadEvents(client) {
  console.log('🔍 Chargement des événements...');
  
  const eventsPath = path.join(__dirname);
  console.log('📁 Dossier events:', eventsPath);

  try {
    const files = fs.readdirSync(eventsPath);
    console.log('📄 Fichiers trouvés:', files);
    
    const eventFiles = files.filter(file => 
      file.endsWith(".js") && file !== "eventHandler.js"
    );
    
    console.log('🎯 Fichiers events à charger:', eventFiles);

    for (const file of eventFiles) {
      try {
        console.log(`🔄 Chargement de: ${file}`);
        const event = require(path.join(eventsPath, file));
        
        if (!event.name || !event.execute) {
          console.log(`⚠️ ${file} ignoré: manque name ou execute`);
          continue;
        }

        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }

        console.log(`✅ Événement chargé: ${event.name} depuis ${file}`);
      } catch (error) {
        console.error(`❌ Erreur avec ${file}:`, error.message);
      }
    }
    
    console.log('🎉 Chargement des événements terminé!');
  } catch (error) {
    console.error('❌ Erreur lecture dossier events:', error.message);
  }
}

module.exports = { loadEvents };
