const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js"); // <-- IMPORTANT : import de EmbedBuilder

const warningsFile = path.join(__dirname, "../../warnings.json");
const configFile = path.join(__dirname, "../../config.json");

// Charge ou crée le fichier warnings.json
let warnings = {};
if (fs.existsSync(warningsFile)) {
  warnings = JSON.parse(fs.readFileSync(warningsFile, "utf-8"));
} else {
  fs.writeFileSync(warningsFile, JSON.stringify({}));
}

// Charge le fichier de config pour récupérer le canal de logs
let config = {};
if (fs.existsSync(configFile)) {
  config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
}

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot) return;

    const bannedWords = [
      "pute",
      "salope",
      "ntm",
      "fdp",
      "connard",
      "nigger",
      "nigga",
      "ta mère",
      "pd",
      "enculé"
    ];

    const lower = message.content.toLowerCase();

    for (const word of bannedWords) {
      if (lower.includes(word)) {
        try {
          // Supprime le message offensant
          await message.delete();

          // Message visible par tous dans le salon où le message a été écrit
          await message.channel.send(`🚫 ${message.author}, ton message contenait un mot interdit et a été supprimé.`);

          // Gestion des warnings
          if (!warnings[message.author.id]) warnings[message.author.id] = 0;
          warnings[message.author.id] += 1;

          // Sauvegarde dans warnings.json
          fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));

          // Envoi dans le canal logs pour le staff (embed)
          const logChannelId = config.logChannelId;
          if (logChannelId) {
            const logChannel = client.channels.cache.get(logChannelId);
            if (logChannel) {
              // sécurité si message.content trop long pour un champ d'embed (max ~1024)
              const deletedContent = message.content
                ? (message.content.length > 1000 ? message.content.slice(0, 1000) + "..." : message.content)
                : "Aucun contenu";

              const embed = new EmbedBuilder()
                .setColor(0x9B59B6) // orange (hex)
                .setTitle("🧹 Message supprimé pour insulte")
                .addFields(
                  { name: "Auteur", value: `${message.author.tag}`, inline: true },
                  { name: "Salon", value: `${message.channel}`, inline: true },
                  { name: "Contenu supprimé", value: deletedContent },
                  { name: "Avertissement", value: `${warnings[message.author.id]}/3`, inline: true },
                  { name: "ID utilisateur", value: `${message.author.id} • ${new Date().toLocaleString()}`, inline: true }
                );

              await logChannel.send({ embeds: [embed] });
            }
          }

          console.log(`🧹 Message supprimé et avertissement ajouté : ${message.author.tag}`);

          // Si 3 avertissements, timeout pendant 10 minutes
          if (warnings[message.author.id] >= 3) {
            try {
              const duration = 10 * 60 * 1000; // 10 minutes en ms
              // Vérifie que message.member existe (message hors DM)
              if (message.member && message.member.timeout) {
                await message.member.timeout(duration, "Accumulation de 3 avertissements");
              }

              // Message log pour le staff (embed timeout)
              if (logChannelId) {
                const logChannel = client.channels.cache.get(logChannelId);
                if (logChannel) {
                  const embedTimeout = new EmbedBuilder()
                    .setColor(0xFF4500)
                    .setTitle("🔇 Timeout appliqué")
                    .addFields(
                      { name: "Utilisateur", value: `${message.author.tag}`, inline: true },
                      { name: "Durée", value: `10 minutes`, inline: true },
                      { name: "Raison", value: `Accumulation de 3 avertissements` },
                      { name: "ID utilisateur", value: `${message.author.id} • ${new Date().toLocaleString()}`, inline: true }
                    );

                  await logChannel.send({ embeds: [embedTimeout] });
                }
              }

              // Remettre le compteur à 0
              warnings[message.author.id] = 0;
              fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2));

            } catch (err) {
              console.error("Erreur lors du timeout :", err);
            }
          }

        } catch (err) {
          console.error("Erreur suppression message :", err);
        }
        break; // Stop après le premier mot interdit trouvé
      }
    }
  },
};
