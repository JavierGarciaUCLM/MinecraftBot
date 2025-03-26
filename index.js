// index.js

// 1. Importaciones
const mineflayer = require('mineflayer');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config(); // Carga variables del .env
const { isSpamming } = require('./spamProtection');
const { processInquisition, getBank } = require('./db/economy');
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// 2. Configuración del bot de Minecraft
let mcBot; // Variable global para el bot de Minecraft
const onlinePlayers = new Set(); //Set de users
let initialLoad = true;

const mensajesAleatorios = [
  'I love the Spanish!',
  'Best clan? The Inquisition.',
  'Inquisition is always back, no matter what!',
  'Inquisition won',
  'We miss you npintea...',
  'Nikoxlas? Who is him?',
  'INQ WIN',
  'Never forget 2nd Hispanic Panic',
  'I hate Poland.',
  'Man, I miss _letrasado’s mom',
  'No way I’m cleaning up that paño mojao',
  'Francis was temporal, Inquisition is forever',
  'If I ever get to luispatapalo’s house…',
  'I built a giant Spongebob, what did you do?',
  'Events? But wait for Diakhaba',
  'Sleepobot is such a NERD',
  'MARCOS SUELTA EL CALCETIN',
  'Hasta los cojones de pretender que no soy español… chipi traeme una caña',
  'I griefed 3words',
  'QUAGSMARIA is ETERNAL',
  'Este malagueño folla como un toro, y sin usar pastillas!'
];


function createMinecraftBot() {
  mcBot = mineflayer.createBot({
    host: process.env.MC_HOST,
    port: Number(process.env.MC_PORT),
    username: process.env.MC_USERNAME,
    auth: 'microsoft',
    refreshToken: process.env.REFRESH_TOKEN,
    version: '1.21.4'
  });

  function enviarMensajeAleatorio() {
    const indiceAleatorio = Math.floor(Math.random() * mensajesAleatorios.length);
    const mensaje = mensajesAleatorios[indiceAleatorio];
    mcBot.chat(mensaje);
  }

  mcBot.on('spawn', () => {
    console.log('Bot de Minecraft conectado.');
    for (const playerName of Object.keys(mcBot.players)) {
      onlinePlayers.add(playerName);
    }
    // Tras 5 segundos (ajusta el tiempo si quieres), salimos de la "carga inicial"
    setTimeout(() => {
      initialLoad = false;
      console.log('Finalizada la carga inicial de jugadores.');
    }, 5000);
      // Esto es lo de enviar los mensajes randoms
    setInterval(enviarMensajeAleatorio, 13 * 60 * 1000);
  });

  mcBot.on('end', () => {
    console.log('El bot de Minecraft se ha desconectado.');
    // Aquí podrías notificar en Discord que el bot se desconectó, o reintentar la conexión.
  });

  mcBot.on('playerJoined', (player) => {
    if (initialLoad) return;
    // Si no está en el set, es una conexión "real"
    if (!onlinePlayers.has(player.username)) {
      onlinePlayers.add(player.username);
      if (player.username === 'chipinazo') {
        mcBot.chat('Creator! Welcome back genius.');
      }
      if (player.username === '_letrasado') {
        mcBot.chat('Welcome back Letrasado, kisses from el Copas.');
      }
      if (player.username === 'MrDavid99') {
        mcBot.chat('Hey David! I also hate polish and albanians.');
      }
      if (player.username === 'Diakhaba') {
        mcBot.chat('Cómo te huelen los pinrreles.');
      }
      if (player.username === 'marcosgo16') {
        mcBot.chat('Ponte a trabajar bujarra!');
      }
      if (player.username === 'PowerXInfinito') {
        mcBot.chat('Paño de pipí mojao');
      }
      if (player.username === 'Juane9') {
        mcBot.chat('Joseeeee, tienes la libreta con los ejercicios cariño?');
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
  mcBot.on('chat', async (username, message) => {
    if (isSpamming(username)) {
      mcBot.whisper(username, "You are muted for spam. Wait a minute before talking to the bot.");
      return;
    }
    const channel = discordClient.channels.cache.get(process.env.CHANNEL_ID);
    if (channel) {
      if (username === mcBot.username) {
        channel.send(`[Bot de Minecraft] ${message}`);
      } else {
        channel.send(`[${username}] ${message}`);
      }
      if (message.toLowerCase() === '!inquisition') {
        const result = await processInquisition(username);
        if (result.success) {
          mcBot.chat(`${username}, you have received 25 InquiCoins. Your total bank account is ${result.points}.`);
        } else if (result.remaining !== undefined) {
          const minutes = Math.ceil(result.remaining / (60 * 1000));
          mcBot.chat(`${username}, please wait ${minutes} minutes before receiving more InquiCoins.`);
        } else {
          mcBot.chat(`${username}, there was an error processing your request.`);
        }
    }
    if (message.toLowerCase().startsWith('!bank')) {
      //Division del mensaje por espacios, si hay más de 1 pues supone que es el nombre del usuario
      const parts = message.split(' ');
      const targetUsername = (parts.length > 1) ? parts.slice(1).join(' ') : username;
  
      getBank(targetUsername)
        .then(account => {
          if (targetUsername === username) {
            mcBot.chat(`${username}, your InquiCoins balance is ${account}.`);
          } else {
            mcBot.chat(`${username}, ${targetUsername}'s InquiCoins balance is ${account}.`);
          }
        })
        .catch(err => {
          console.error('Error en !bank:', err);
          mcBot.chat(`${username}, there was an error processing your request.`);
        });
    }
  }
  });
}

// Inicializa el bot de Minecraft
createMinecraftBot();


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
      message.channel.send(`El bot de Minecraft no está conectado actualmente.`);
    }
  }

  // Ejemplo: "!ping" -> el bot de Discord responde con "pong"
  if (message.content.toLowerCase() === '!ping') {
    message.reply('pong');
  }
  if (message.content.toLowerCase() === '!online') {
    // Convierte el set en un array
    const playersArray = Array.from(onlinePlayers);

    if (playersArray.length === 0) {
      message.channel.send(`No hay jugadores conectados en Minecraft.`);
    } else {
      // Crea una cadena con los nombres
      const playersList = playersArray.join(', ');
      message.channel.send(`Jugadores conectados: ${playersList}`);
    }
  }
});


// 3.3 Iniciar sesión en Discord
discordClient.login(process.env.DISCORD_TOKEN);