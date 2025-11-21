const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
require("dotenv").config();

// Structure pour stocker les fichiers des tickets par message
const ticketFiles = {}; // clé = channel.id, valeur = { messageId: [fichiers] }
const ticketActivity = {}; // clé = channel.id, valeur = timestamp du dernier message

// Stocker quel staff a claim chaque ticket
const ticketClaims = {}; // clé = channel.id, valeur = staffMemberId

const { loadEvents } = require("./events/eventHandler");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// Variables d'environnement
const {
  TOKEN,
  CATEGORY_ID,
  STAFF_ROLE_ID,
  HELPER_ROLE_ID,
  MODO_ROLE_ID,
  SUPERMODO_ROLE_ID,
  ADMIN_ROLE_ID,
  DEV_ROLE_ID,
  HELPER_CATEGORY_ID,
  MODO_CATEGORY_ID,
  SUPERMODO_CATEGORY_ID,
  ADMIN_CATEGORY_ID,
  DEV_CATEGORY_ID,
  LOGS_CHANNEL_ID
} = process.env;

// ✅ Bot prêt
client.once("clientReady", () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

// 🧾 Commande pour envoyer les boutons de tickets
client.on("messageCreate", async (message) => {
  if (message.content === "!setup-ticket") {
    // Création des boutons pour chaque catégorie
    const jeuButton = new ButtonBuilder()
      .setCustomId("ticket-jeu")
      .setLabel("🎰 Problème en jeu")
      .setStyle(ButtonStyle.Primary);

    const gradeButton = new ButtonBuilder()
      .setCustomId("ticket-grade")
      .setLabel("🗣️ Demande de grade")
      .setStyle(ButtonStyle.Primary);

    const remboursementButton = new ButtonBuilder()
      .setCustomId("ticket-remboursement")
      .setLabel("💰 Demande de remboursement")
      .setStyle(ButtonStyle.Primary);

    const reportButton = new ButtonBuilder()
      .setCustomId("ticket-report")
      .setLabel("❗ Report / Contestation")
      .setStyle(ButtonStyle.Primary);

    const autreButton = new ButtonBuilder()
      .setCustomId("ticket-autre")
      .setLabel("💬 Autre")
      .setStyle(ButtonStyle.Primary);

    // Deux rangées de boutons
    const row1 = new ActionRowBuilder().addComponents(jeuButton, gradeButton, remboursementButton);
    const row2 = new ActionRowBuilder().addComponents(reportButton, autreButton);

    const embed = new EmbedBuilder()
      .setColor("#6d1aba")
      .setTitle("🏷️​ Centre de support 📌​")
      .setDescription(
        "Veuillez choisir la catégorie qui correspond le mieux à votre problème en cliquant sur l'un des boutons ci-dessous.\n\nUn membre du staff prendra votre ticket dès que possible."
      )
      .setFooter({ text: "Système de tickets", iconURL: message.guild.iconURL() });

    await message.channel.send({ embeds: [embed], components: [row1, row2] });
    await message.reply({ content: "✅ Centre de support configuré avec des boutons réutilisables !", ephemeral: true });
  }
});

// 🎫 Création du ticket AVEC BOUTONS
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  
  // Vérifie si c'est un bouton de ticket
  const ticketTypes = ["ticket-jeu", "ticket-grade", "ticket-remboursement", "ticket-report", "ticket-autre"];
  if (!ticketTypes.includes(interaction.customId)) return;

  const guild = interaction.guild;
  const user = interaction.user;
  const ticketType = interaction.customId.replace("ticket-", "");
  
  // Nouveau nom de ticket avec timestamp pour éviter les conflits
  const timestamp = Date.now();
  const ticketName = `ticket-${ticketType}-${user.username}-${timestamp}`.toLowerCase().slice(0, 100);

  // Vérifie seulement les tickets OUVERTS existants pour cet utilisateur
  const userOpenTickets = guild.channels.cache.filter(channel => {
    if (channel.type !== 0 || !channel.name.startsWith('ticket-')) return false;
    if (!channel.name.includes(user.username.toLowerCase())) return false;
    return true;
  });

  if (userOpenTickets.size > 0) {
    const openTicket = userOpenTickets.first();
    return interaction.reply({
      content: `❗ Vous avez déjà un ticket ouvert : ${openTicket}. Veuillez d'abord fermer votre ticket actuel avant d'en créer un nouveau.`,
      ephemeral: true,
    });
  }

  // Crée le salon privé avec permissions COMPLÈTES pour tous les rôles staff
  const ticketChannel = await guild.channels.create({
    name: ticketName,
    type: 0,
    parent: CATEGORY_ID,
    permissionOverwrites: [
      { 
        id: guild.roles.everyone, 
        deny: [PermissionsBitField.Flags.ViewChannel] 
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
        ],
      },
      // PERMISSIONS POUR TOUS LES RÔLES STAFF
      {
        id: HELPER_ROLE_ID,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
        ],
      },
      {
        id: MODO_ROLE_ID,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
        ],
      },
      {
        id: SUPERMODO_ROLE_ID,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
        ],
      },
      {
        id: ADMIN_ROLE_ID,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
        ],
      },
      {
        id: DEV_ROLE_ID,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels,
          PermissionsBitField.Flags.ManageMessages,
        ],
      },
    ],
  });

  // === Boutons Claim + Fermer dans le même message ===
  const claimButton = new ButtonBuilder()
    .setCustomId("claim-ticket")
    .setLabel("🔧​Prendre en charge")
    .setStyle(ButtonStyle.Primary);

  const transferButton = new ButtonBuilder()
    .setCustomId("transfer-ticket")
    .setLabel("📜​ Résumer le ticket")
    .setStyle(ButtonStyle.Secondary);
  
  const closeButton = new ButtonBuilder()
    .setCustomId("close-ticket")
    .setLabel("❌ Fermer le ticket")
    .setStyle(ButtonStyle.Danger);

  const buttonRow = new ActionRowBuilder().addComponents(claimButton, transferButton, closeButton);

  // Déterminer le nom de catégorie pour l'affichage
  const categoryNames = {
    jeu: "🎰 Problème en jeu",
    grade: "🗣️ Demande de grade", 
    remboursement: "💰 Demande de remboursement",
    report: "❗ Report / Contestation",
    autre: "💬 Autre"
  };

  const categoryDisplayName = categoryNames[ticketType] || ticketType;

  // Embed de bienvenue stylé
  const welcomeEmbed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("🎟️ Ticket créé avec succès !")
    .setDescription(
      `Bonjour ${user} 👋\n\n**Catégorie :** ${categoryDisplayName}\n\nMerci d'avoir contacté le support.\nUn membre du staff va bientôt vous assister.\n\n> Pendant ce temps, veuillez décrire **clairement votre problème** afin de faciliter la prise en charge.`
    )
    .setFooter({
      text: "Système de tickets",
      iconURL: guild.iconURL(),
    })
    .setTimestamp();

  await ticketChannel.send({
    content: `${user}`,
    embeds: [welcomeEmbed],
    components: [buttonRow],
  });

  await interaction.reply({
    content: `✅ Votre ticket a été créé : ${ticketChannel}`,
    ephemeral: true,
  });
});

// === FONCTION POUR SYNCHRONISER LES PERMISSIONS ===
async function syncTicketPermissions(channel, targetCategory, ticketOwner) {
  const guild = channel.guild;
  
  // Détermine quels rôles peuvent parler selon la catégorie (VOTRE HIÉRARCHIE)
  let allowedRoles = [];
  
  switch(targetCategory) {
    case HELPER_CATEGORY_ID:
      // Helpers, Modos, Super-Modos, Admins, Devs peuvent parler
      allowedRoles = [HELPER_ROLE_ID, MODO_ROLE_ID, SUPERMODO_ROLE_ID, ADMIN_ROLE_ID, DEV_ROLE_ID];
      break;
    case MODO_CATEGORY_ID:
      // Modos, Super-Modos, Admins, Devs peuvent parler
      allowedRoles = [MODO_ROLE_ID, SUPERMODO_ROLE_ID, ADMIN_ROLE_ID, DEV_ROLE_ID];
      break;
    case SUPERMODO_CATEGORY_ID:
      // Super-Modos, Admins, Devs peuvent parler
      allowedRoles = [SUPERMODO_ROLE_ID, ADMIN_ROLE_ID, DEV_ROLE_ID];
      break;
    case ADMIN_CATEGORY_ID:
      // Admins, Devs peuvent parler
      allowedRoles = [ADMIN_ROLE_ID, DEV_ROLE_ID];
      break;
    case DEV_CATEGORY_ID:
      // Admins, Devs peuvent parler
      allowedRoles = [ADMIN_ROLE_ID, DEV_ROLE_ID];
      break;
    default:
      // Catégorie par défaut - tous les staff peuvent parler
      allowedRoles = [HELPER_ROLE_ID, MODO_ROLE_ID, SUPERMODO_ROLE_ID, ADMIN_ROLE_ID, DEV_ROLE_ID];
  }

  // Préparation des permissions
  const permissionOverwrites = [
    // Tout le monde ne peut pas voir
    { 
      id: guild.roles.everyone, 
      deny: [PermissionsBitField.Flags.ViewChannel] 
    },
    // Le propriétaire du ticket peut toujours voir et parler
    {
      id: ticketOwner.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
      ],
    },
    // Le bot peut tout faire
    {
      id: client.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ManageMessages,
      ],
    },
  ];

  // Ajoute les permissions pour les rôles autorisés (peuvent voir ET parler)
  allowedRoles.forEach(roleId => {
    permissionOverwrites.push({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
      ],
    });
  });

  // Ajoute les permissions pour les rôles staff qui peuvent seulement voir (mais pas parler)
  const allStaffRoles = [HELPER_ROLE_ID, MODO_ROLE_ID, SUPERMODO_ROLE_ID, ADMIN_ROLE_ID, DEV_ROLE_ID];
  const readOnlyRoles = allStaffRoles.filter(roleId => !allowedRoles.includes(roleId));
  
  readOnlyRoles.forEach(roleId => {
    permissionOverwrites.push({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
      deny: [
        PermissionsBitField.Flags.SendMessages,
      ],
    });
  });

  // Applique les nouvelles permissions
  await channel.permissionOverwrites.set(permissionOverwrites);
}

// === GESTION DES BOUTONS DANS LES TICKETS ===

// 🛠️ Gestion du bouton Claim - VERSION AVEC SYNCHRONISATION
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "claim-ticket") return;

  const member = interaction.member;
  const channel = interaction.channel;
  const guild = interaction.guild;

  // Vérifie que seul un staff peut claim
  if (
    !member.roles.cache.has(HELPER_ROLE_ID) &&
    !member.roles.cache.has(MODO_ROLE_ID) &&
    !member.roles.cache.has(SUPERMODO_ROLE_ID) &&
    !member.roles.cache.has(ADMIN_ROLE_ID) &&
    !member.roles.cache.has(DEV_ROLE_ID)
  ) {
    return interaction.reply({
      content: "🚫 Seul un membre du staff peut prendre ce ticket.",
      ephemeral: true,
    });
  }

  // Détermine le rôle du staff et la catégorie cible
  let targetCategory;
  let grade;

  if (member.roles.cache.has(SUPERMODO_ROLE_ID)) {
    targetCategory = SUPERMODO_CATEGORY_ID;
    grade = "Super-Modo";
  } else if (member.roles.cache.has(MODO_ROLE_ID)) {
    targetCategory = MODO_CATEGORY_ID;
    grade = "Modérateur";
  } else if (member.roles.cache.has(HELPER_ROLE_ID)) {
    targetCategory = HELPER_CATEGORY_ID;
    grade = "Helper";
  } else if (member.roles.cache.has(ADMIN_ROLE_ID)) {
    targetCategory = ADMIN_CATEGORY_ID;
    grade = "Admin";
  } else { 
    targetCategory = DEV_CATEGORY_ID;
    grade = "Dev";
  }

  try {
    // Récupère l'utilisateur qui a créé le ticket depuis le nom du channel
    const ticketName = channel.name;
    const usernameMatch = ticketName.match(/ticket-[^-]+-(.+)-/);
    let ticketOwner = null;
    
    if (usernameMatch) {
      const username = usernameMatch[1];
      // Trouve l'utilisateur par son username
      ticketOwner = guild.members.cache.find(member => 
        member.user.username.toLowerCase() === username.toLowerCase()
      );
    }

    if (!ticketOwner) {
      return interaction.reply({
        content: "⚠️ Impossible de trouver le propriétaire du ticket.",
        ephemeral: true,
      });
    }

    // SYNCHRONISE LES PERMISSIONS AVANT LE DÉPLACEMENT
    await syncTicketPermissions(channel, targetCategory, ticketOwner);

    // Déplace le ticket
    await channel.setParent(targetCategory, { 
      lockPermissions: false // IMPORTANT: ne pas verrouiller les permissions
    });

    // STOCKER QUI A CLAIM LE TICKET
    ticketClaims[channel.id] = member.id;

    // Embed de confirmation Claim
    const claimedEmbed = new EmbedBuilder()
      .setColor("#43B581")
      .setTitle("✅ Ticket pris en charge")
      .setDescription(`Le ticket est maintenant géré par ${member} (${grade}).\n\n**Catégorie :** ${grade}\n\nLe staff sera notifié à chaque nouveau message.`)
      .setFooter({ text: "Support en cours de traitement" })
      .setTimestamp();

    await interaction.reply({ embeds: [claimedEmbed], ephemeral: false });
  } catch (err) {
    console.error("Erreur Claim :", err);
    interaction.reply({
      content: "⚠️ Erreur lors du déplacement du ticket.",
      ephemeral: true,
    });
  }
});

// === TRANSFERT DE TICKET ===
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // 🔁 Si le bouton "Résumer le ticket" est cliqué
  if (interaction.customId === "transfer-ticket") {
    // Vérifie que le membre est staff
    if (
      !interaction.member.roles.cache.has(HELPER_ROLE_ID) &&
      !interaction.member.roles.cache.has(MODO_ROLE_ID) &&
      !interaction.member.roles.cache.has(ADMIN_ROLE_ID) &&
      !interaction.member.roles.cache.has(DEV_ROLE_ID) &&
      !interaction.member.roles.cache.has(SUPERMODO_ROLE_ID)
    ) {
      return interaction.reply({
        content: "🚫 Seul un membre du staff peut transférer un ticket.",
        ephemeral: true,
      });
    }

    // Création de la modale
    const modal = new ModalBuilder()
      .setCustomId("transfer-modal")
      .setTitle("📜 Résumer de ticket");

    // Champs texte
    const playerName = new TextInputBuilder()
      .setCustomId("player-name")
      .setLabel("Nom du joueur concerné")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const problemField = new TextInputBuilder()
      .setCustomId("problem-description")
      .setLabel("Description du problème")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const targetStaff = new TextInputBuilder()
      .setCustomId("target-staff")
      .setLabel("Staff destinataire (pseudo ou rôle)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    // Organisation en lignes
    const row1 = new ActionRowBuilder().addComponents(playerName);
    const row2 = new ActionRowBuilder().addComponents(problemField);
    const row3 = new ActionRowBuilder().addComponents(targetStaff);

    modal.addComponents(row1, row2, row3);

    // Envoie la modale à l'utilisateur
    await interaction.showModal(modal);
  }
});

// === GESTION DE LA FERMETURE ===
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// --- Sauvegarder les fichiers ---
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const channel = message.channel;

  if (!channel.name.startsWith("ticket-")) return;

  // Crée la structure pour ce canal
  if (!ticketFiles[channel.id]) ticketFiles[channel.id] = {};
  ticketFiles[channel.id][message.id] = [];

  const ticketDir = path.join(__dirname, "tickets", channel.name);
  if (!fs.existsSync(ticketDir)) fs.mkdirSync(ticketDir, { recursive: true });

  for (const attachment of message.attachments.values()) {
    const filePath = path.join(ticketDir, attachment.name);
    try {
      const response = await axios.get(attachment.url, { responseType: "arraybuffer" });
      fs.writeFileSync(filePath, response.data);
      ticketFiles[channel.id][message.id].push(filePath);
      console.log(`Fichier sauvegardé : ${filePath}`);
    } catch (err) {
      console.error(`Impossible de télécharger ${attachment.url}`, err.message);
    }
  }
});

async function generateHTMLArchive(channel, member) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = Array.from(messages.values()).reverse();
  let htmlMessages = "";

  for (const m of sorted) {
    let content = m.cleanContent || "";
    const attachmentsHTML = [];

    // VERSION CORRIGÉE : Utiliser les attachments Discord directement
    for (const attachment of m.attachments.values()) {
      const ext = attachment.name ? attachment.name.split('.').pop().toLowerCase() : '';
      if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
        // Lien direct vers l'image sans téléchargement
        attachmentsHTML.push(`<div class="attachment"><img src="${attachment.url}" class="image" alt="${attachment.name}"></div>`);
      } else {
        // Lien direct vers le fichier
        attachmentsHTML.push(`<div class="attachment"><a href="${attachment.url}" target="_blank">📎 ${attachment.name}</a></div>`);
      }
    }

    content += attachmentsHTML.join("\n");

    htmlMessages += `
      <div class="message">
        <img src="${m.author.displayAvatarURL({ size: 64 })}" class="avatar">
        <div class="content">
          <div class="header">
            <span class="username">${m.author.tag}</span>
            <span class="timestamp">${m.createdAt.toLocaleString()}</span>
          </div>
          <div class="text">${content || "<i>(message vide)</i>"}</div>
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Archive du ticket ${channel.name}</title>
<style>
body { background-color: #2f3136; color: #dcddde; font-family: "Whitney", "Helvetica Neue", Helvetica, Arial, sans-serif; margin: 0; padding: 20px; }
h2 { color: #ffffff; }
.message { display: flex; align-items: flex-start; margin-bottom: 12px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; }
.content { background-color: #36393f; padding: 10px; border-radius: 8px; width: fit-content; max-width: 85%; }
.header { font-size: 0.9em; color: #b9bbbe; margin-bottom: 5px; }
.username { color: #fff; font-weight: 600; }
.timestamp { margin-left: 10px; color: #72767d; font-size: 0.8em; }
.text { white-space: pre-wrap; color: #dcddde; }
.attachment { margin-top: 8px; }
.image { max-width: 300px; border-radius: 8px; margin-top: 5px; }
a { color: #00aff4; text-decoration: none; }
a:hover { text-decoration: underline; }
</style>
</head>
<body>
<h2>📁 Archive du ticket : ${channel.name}</h2>
<p>Fermé par : ${member.user.tag} • Date : ${new Date().toLocaleString()}</p>
<hr>
${htmlMessages}
</body>
</html>
`;
}

// --- Boutons close-ticket ---
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const channel = interaction.channel;
  const member = interaction.member;

  if (interaction.customId === "close-ticket") {
    const confirmButton = new ButtonBuilder().setCustomId("confirm-close").setLabel("🔒 Oui, fermer le ticket").setStyle(ButtonStyle.Danger);
    const cancelButton = new ButtonBuilder().setCustomId("cancel-close").setLabel("🔁 Annuler").setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const confirmEmbed = new EmbedBuilder()
      .setColor("#ED4245")
      .setTitle("❌ Confirmation de fermeture")
      .setDescription("Êtes-vous sûr de vouloir fermer ce ticket ?\n\n> 🔒 Oui\n> 🔁 Annuler");

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
  }

  if (interaction.customId === "confirm-close") {
    await interaction.update({ embeds: [new EmbedBuilder().setColor("#ED4245").setTitle("🕒 Fermeture du ticket").setDescription("Archivage en cours...")], components: [] });

    setTimeout(async () => {
      try {
        const html = await generateHTMLArchive(channel, member);
        const htmlPath = path.join(__dirname, `tickets`, `${channel.name}.html`);
        fs.writeFileSync(htmlPath, html);

        const logChannel = client.channels.cache.get(LOGS_CHANNEL_ID);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setTitle("🗂️ Ticket archivé")
            .setDescription(`**Ticket :** ${channel.name}\n**Fermé par :** ${member}\n**Date :** <t:${Math.floor(Date.now()/1000)}:F>`)
            .setFooter({ text: "Système de tickets - Archive HTML" })
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed], files: [htmlPath] });
        }

        // Supprimer le dossier temporaire du ticket
        const ticketDir = path.join(__dirname, "tickets", channel.name);
        if (fs.existsSync(ticketDir)) fs.rmSync(ticketDir, { recursive: true, force: true });

        // Supprime le claim quand le ticket est fermé
        delete ticketClaims[channel.id];

        await channel.delete();
      } catch (err) {
        console.error("Erreur fermeture ticket :", err);
      }
    }, 5000);
  }

  if (interaction.customId === "cancel-close") {
    await interaction.update({ embeds: [new EmbedBuilder().setColor("#57F287").setDescription("✅ Fermeture annulée. Le ticket reste ouvert !")], components: [] });
  }
});

// === GESTION DU TRANSFERT MODAL - VERSION AVEC SYNCHRONISATION ===
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== "transfer-modal") return;

  const playerName = interaction.fields.getTextInputValue("player-name");
  const problemDescription = interaction.fields.getTextInputValue("problem-description");
  const targetStaff = interaction.fields.getTextInputValue("target-staff").toLowerCase();
  const channel = interaction.channel;
  const guild = interaction.guild;

  let targetCategory;
  let targetRole;
  let roleLabel;

  // 🔍 Déterminer le rôle / catégorie cible selon ce que le staff écrit
  if (targetStaff.includes("supermodo") || targetStaff.includes("super-modo")) {
    targetCategory = SUPERMODO_CATEGORY_ID;
    targetRole = SUPERMODO_ROLE_ID;
    roleLabel = "Super-Modo";
  } else if (targetStaff.includes("modo") || targetStaff.includes("modérateur")) {
    targetCategory = MODO_CATEGORY_ID;
    targetRole = MODO_ROLE_ID;
    roleLabel = "Modérateur";
  } else if (targetStaff.includes("admin") || targetStaff.includes("administrateur")) {
    targetCategory = ADMIN_CATEGORY_ID;
    targetRole = ADMIN_ROLE_ID;
    roleLabel = "Admin";
  } else if (targetStaff.includes("dev") || targetStaff.includes("développeur")) {
    targetCategory = DEV_CATEGORY_ID;
    targetRole = DEV_ROLE_ID;
    roleLabel = "Dev";
  } else if (targetStaff.includes("helper") || targetStaff.includes("assistant")) {
    targetCategory = HELPER_CATEGORY_ID;
    targetRole = HELPER_ROLE_ID;
    roleLabel = "Helper";
  } else {
    return interaction.reply({
      content: "⚠️ Impossible d'identifier le rôle cible. Utilise 'Helper', 'Modo', 'SuperModo', 'Admin', 'Dev'.",
      ephemeral: true,
    });
  }

  try {
    // Récupère l'utilisateur qui a créé le ticket depuis le nom du channel
    const ticketName = channel.name;
    const usernameMatch = ticketName.match(/ticket-[^-]+-(.+)-/);
    let ticketOwner = null;
    
    if (usernameMatch) {
      const username = usernameMatch[1];
      // Trouve l'utilisateur par son username
      ticketOwner = guild.members.cache.find(member => 
        member.user.username.toLowerCase() === username.toLowerCase()
      );
    }

    if (!ticketOwner) {
      return interaction.reply({
        content: "⚠️ Impossible de trouver le propriétaire du ticket.",
        ephemeral: true,
      });
    }

    // SYNCHRONISE LES PERMISSIONS AVANT LE DÉPLACEMENT
    await syncTicketPermissions(channel, targetCategory, ticketOwner);

    // 🔁 Déplace le ticket
    await channel.setParent(targetCategory, { 
      lockPermissions: false // IMPORTANT: ne pas verrouiller les permissions
    });

    // Si un transfert a lieu, on supprime le claim actuel
    // Le nouveau staff devra reclamer le ticket
    delete ticketClaims[channel.id];

    // 🧾 Embed de résumé
    const embed = new EmbedBuilder()
      .setColor("#FEE75C")
      .setTitle("📜 Résumer de ticket")
      .setDescription(
        `**👤 Joueur :** ${playerName}\n**🧾 Problème :** ${problemDescription}\n**🎯 Transféré à :** ${roleLabel}`
      )
      .setFooter({ text: `Transféré par ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });

    console.log(`✅ Ticket ${channel.name} transféré vers ${roleLabel}`);
  } catch (err) {
    console.error("Erreur lors du transfert :", err);
    interaction.reply({
      content: "⚠️ Erreur lors du transfert du ticket.",
      ephemeral: true,
    });
  }
});

// 🔔 NOTIFICATION AUTOMATIQUE QUAND LE JOUEUR ENVOIE UN MESSAGE
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const channel = message.channel;

  // Vérifie si c'est un ticket
  if (!channel.name.startsWith("ticket-")) return;

  // Vérifie si le ticket a été claim
  const claimedStaffId = ticketClaims[channel.id];
  if (!claimedStaffId) return;

  // Vérifie que le message vient du joueur (pas du staff)
  const isStaff = message.member.roles.cache.has(HELPER_ROLE_ID) || 
                  message.member.roles.cache.has(MODO_ROLE_ID) || 
                  message.member.roles.cache.has(SUPERMODO_ROLE_ID) || 
                  message.member.roles.cache.has(ADMIN_ROLE_ID) || 
                  message.member.roles.cache.has(DEV_ROLE_ID);

  if (isStaff) return; // Ne pas ping si c'est le staff qui parle

  try {
    // Récupère le membre staff
    const staffMember = await channel.guild.members.fetch(claimedStaffId);
    
    if (staffMember) {
      // Envoie une notification discrète (presque ghost ping)
      const notification = await message.reply({
        content: `📨 ${staffMember} - Nouveau message de ${message.author}`,
        allowedMentions: { users: [staffMember.id] }
      });

      // Supprime la notification après 2 secondes pour un effet "ghost ping"
      setTimeout(async () => {
        try {
          await notification.delete();
        } catch (err) {
          // Ignore si le message a déjà été supprimé
        }
      }, 2000);
    }
  } catch (err) {
    console.error("Erreur notification staff:", err);
  }
});

client.on('messageCreate', message => {
  if (message.author.bot) return;
  
  // ... vos autres commandes existantes ...

  // 🎁 COMMANDE !GIFT - Affiche votre GIF hamster
  if (message.content === '!gift') {
    const giftEmbed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setImage('https://tenor.com/fr/view/suck-it-hamster-carrot-gif-16172457')
      .setTimestamp();

    message.channel.send({ embeds: [giftEmbed] });
  }
});
loadEvents(client);

client.login(TOKEN);




