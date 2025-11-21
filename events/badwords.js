const { EmbedBuilder } = require("discord.js");

let warnings = {};

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot) return;

    const bannedWords = [
      "pute", "salope", "ntm", "fdp", "connard", 
      "nigger", "nigga", "ta mère", "pd", "enculé"
    ];

    const lower = message.content.toLowerCase();

    for (const word of bannedWords) {
      if (lower.includes(word)) {
        try {
          console.log(`🔍 Mot interdit détecté: "${word}" par ${message.author.tag}`);
          
          await message.delete();
          await message.channel.send(`🚫 ${message.author}, ton message contenait un mot interdit et a été supprimé.`);

          if (!warnings[message.author.id]) warnings[message.author.id] = 0;
          warnings[message.author.id] += 1;

          // ✅ DÉBOGAGE DÉTAILLÉ
          const logChannelId = process.env.LOGSM_CHANNEL_ID;
          console.log(`📋 LOGSM_CHANNEL_ID: ${logChannelId}`);
          
          if (logChannelId) {
            console.log(`🔍 Recherche du salon ${logChannelId}...`);
            const logChannel = client.channels.cache.get(logChannelId);
            
            if (logChannel) {
              console.log(`✅ Salon trouvé: ${logChannel.name}`);
              
              const deletedContent = message.content
                ? (message.content.length > 1000 ? message.content.slice(0, 1000) + "..." : message.content)
                : "Aucun contenu";

              const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle("🧹 Message supprimé - Mot interdit")
                .addFields(
                  { name: "👤 Auteur", value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
                  { name: "📌 Salon", value: `${message.channel}`, inline: true },
                  { name: "⚠️ Avertissement", value: `**${warnings[message.author.id]}/3**`, inline: true },
                  { name: "🗑️ Contenu supprimé", value: `\`\`\`${deletedContent}\`\`\`` },
                  { name: "🔍 Mot détecté", value: `\`${word}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Auto-modération • Système de warnings' });

              console.log(`📤 Envoi de l'embed...`);
              await logChannel.send({ embeds: [embed] });
              console.log(`✅ Embed envoyé avec succès!`);
              
            } else {
              console.log(`❌ Salon non trouvé avec l'ID: ${logChannelId}`);
            }
          } else {
            console.log(`❌ LOGSM_CHANNEL_ID non défini`);
          }

          console.log(`🧹 Message supprimé - ${message.author.tag} - Avertissement: ${warnings[message.author.id]}/3`);

        } catch (err) {
          console.error("❌ Erreur dans l'auto-modération:", err);
        }
        break;
      }
    }
  },
};
