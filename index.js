// index.js

// 1. Importaciones
const mineflayer = require('mineflayer');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config(); // Carga variables de .env

// 2. Configuración del bot de Minecraft
let mcBot; // Variable global para el bot de Minecraft


function createMinecraftBot() {
  mcBot = mineflayer.createBot({
    host: process.env.MC_HOST,
    port: Number(process.env.MC_PORT),
    username: process.env.MC_USERNAME,
    auth: 'microsoft',
    refreshToken: process.env.REFRESH_TOKEN,
    version: '1.21.4'
  });

  mcBot.on('spawn', () => {
    console.log('Bot de Minecraft conectado.');
    for (const playerName of Object.keys(mcBot.players)) {
      onlinePlayers.add(playerName);
    }
  });

  mcBot.on('end', () => {
    console.log('El bot de Minecraft se ha desconectado.');
    // Aquí podrías notificar en Discord que el bot se desconectó, o reintentar la conexión.
  });

  mcBot.on('playerJoined', (player) => {
    // Si no está en el set, es una conexión "real"
    if (!onlinePlayers.has(player.username)) {
      onlinePlayers.add(player.username);
      if (player.username === 'chipinazo') {
        mcBot.chat('Creator! Welcome back genius.');
      } 
    }
      const channel = discordClient.channels.cache.get(process.env.CHANNEL_ID);
      if (channel) {
        channel.send(`${player.username} se ha unido al servidor de Minecraft.`);
      }
  });
  
  mcBot.on('playerLeft', (player) => {
    if (onlinePlayers.has(player.username)) {
      onlinePlayers.delete(player.username);
      // Anuncias la desconexión
    }
    const channel = discordClient.channels.cache.get(process.env.CHANNEL_ID);
    if (channel) {
      channel.send(`${player.username} salió del servidor de Minecraft.`);
    }
  });
  

  mcBot.on('error', (err) => {
    console.error('Error en el bot de Minecraft:', err);
  });

  // 2.1 Ejemplo: Enviar mensajes de Minecraft al canal de Discord
  mcBot.on('chat', (username, message) => {
    // Evitar que se repita lo que el propio bot escribe
    if (username === mcBot.username) return;

    // Buscar el canal de Discord y enviar el mensaje
    const channel = discordClient.channels.cache.get(process.env.CHANNEL_ID);
    if (channel) {
      channel.send(`[${username}] ${message}`);
    }
  });
}

// Inicializa el bot de Minecraft
createMinecraftBot();

// 3. Configuración del bot de Discord
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// 3.1 Evento: Bot de Discord listo
discordClient.once('ready', () => {
  console.log(`Bot de Discord conectado como ${discordClient.user.tag}`);
});

// 3.2 Evento: Procesar mensajes de Discord
discordClient.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Ignora los mensajes de otros bots

  // Ejemplo: "!say Hola" -> el bot de Minecraft escribe "Hola" en el servidor
  if (message.content.startsWith('!say ')) {
    const msg = message.content.slice(5).trim(); // Extrae el texto luego de "!say "
    if (mcBot && mcBot.player) {
      mcBot.chat(msg);
      message.channel.send(`He enviado el mensaje al servidor: "${msg}"`);
    } else {
      message.channel.send('El bot de Minecraft no está conectado actualmente.');
    }
  }

  // Ejemplo: "!ping" -> el bot de Discord responde con "pong"
  if (message.content.toLowerCase() === '!ping') {
    message.reply('pong');
  }
  if (message.content.toLowerCase() === '!dani') {
    message.reply('Es maricon');
  }
});


// 3.3 Iniciar sesión en Discord
discordClient.login(process.env.DISCORD_TOKEN);
