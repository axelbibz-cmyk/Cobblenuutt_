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
          await message.delete();
          await message.channel.send(`🚫 ${message.author}, ton message contenait un mot interdit et a été supprimé.`);

          if (!warnings[message.author.id]) warnings[message.author.id] = 0;
          warnings[message.author.id] += 1;

          // ✅ CORRIGÉ : LOGSM_CHANNEL_ID
          const logChannelId = process.env.LOGSM_CHANNEL_ID;
          if (logChannelId) {
            const logChannel = client.channels.cache.get(logChannelId);
            if (logChannel) {
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

              await logChannel.send({ embeds: [embed] });
            }
          }

          console.log(`🧹 Message supprimé - ${message.author.tag} - Avertissement: ${warnings[message.author.id]}/3`);

          if (warnings[message.author.id] >= 3) {
            try {
              const duration = 10 * 60 * 1000;
              if (message.member && message.member.timeout) {
                await message.member.timeout(duration, "Accumulation de 3 avertissements");
              }

              // ✅ CORRIGÉ ICI AUSSI
              if (logChannelId) {
                const logChannel = client.channels.cache.get(logChannelId);
                if (logChannel) {
                  const embedTimeout = new EmbedBuilder()
                    .setColor(0xFF4500)
                    .setTitle("🔇 Timeout appliqué")
                    .setDescription(`**${message.author.tag}** a été timeout pour 10 minutes`)
                    .addFields(
                      { name: "👤 Utilisateur", value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
                      { name: "⏱️ Durée", value: `10 minutes`, inline: true },
                      { name: "📝 Raison", value: `Accumulation de 3 avertissements` },
                      { name: "⚠️ Total d'avertissements", value: `3/3`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Auto-modération • Timeout automatique' });

                  await logChannel.send({ embeds: [embedTimeout] });
                }
              }

              warnings[message.author.id] = 0;

            } catch (err) {
              console.error("Erreur lors du timeout :", err);
            }
          }

        } catch (err) {
          console.error("Erreur suppression message :", err);
        }
        break;
      }
    }
  },
};
