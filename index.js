// index.js

// 1. Importaciones
const mineflayer = require('mineflayer');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config(); // Carga variables de .env

// 2. Configuración del bot de Minecraft
let mcBot; // Variable global para el bot de Minecraft
const onlinePlayers = new Set(); //Set de users
let initialLoad = true;
const fs = require('fs');
const path = './economy.json';

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


//
//  
//
  function loadDatabase() {
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, JSON.stringify({}));
    }
    const data = fs.readFileSync(path);
    return JSON.parse(data);
  }
  
  // Función para guardar la base de datos JSON
  function saveDatabase(db) {
    fs.writeFileSync(path, JSON.stringify(db, null, 2));
  }
  
  // Función para otorgar puntos si han pasado 8 horas
  function processInquisition(minecraftUsername) {
    const db = loadDatabase();
    const now = Date.now();
    const eightHours = 8 * 60 * 60 * 1000; // 8 horas en milisegundos
  
    if (!db[minecraftUsername]) {
      // Si el usuario no existe, lo inicializamos
      db[minecraftUsername] = {
        points: 0,
        lastInquisition: 0
      };
    }
  
    // Comprueba si han pasado 8 horas desde el último uso del comando
    if (now - db[minecraftUsername].lastInquisition >= eightHours) {
      db[minecraftUsername].points += 25;
      db[minecraftUsername].lastInquisition = now;
      saveDatabase(db);
      return { success: true, points: db[minecraftUsername].points };
    } else {
      const remaining = eightHours - (now - db[minecraftUsername].lastInquisition);
      return { success: false, remaining };
    }
  }

//
//
//


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
    const channel = discordClient.channels.cache.get(process.env.CHANNEL_ID);
    if (channel) {
      if (username === mcBot.username) {
        channel.send(`[Bot de Minecraft] ${message}`);
      } else {
        channel.send(`[${username}] ${message}`);
      }
    }
    if (message.toLowerCase() === '!inquisition') {
      const result = processInquisition(username);
      if (result.success) {
        mcBot.chat(`${username}, you have recived 25 InquiCoins. Your total bank account is ${result.points}. ¡Viva España!`);
      } else {
        const minutes = Math.ceil(result.remaining / (60 * 1000));
        mcBot.chat(`${username}, you must wait ${minutes} minutes to get more InquiCoins.`);
      }
    }
  
    if (message.toLowerCase() === '!bank') {
      const db = loadDatabase();
      // Si el usuario no existe, su saldo es 0
      const account = db[username] ? db[username].points : 0;
      mcBot.chat(`${username}, your InquiCoins balance is ${account}. ¡Viva España!`);
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
  if (message.content.toLowerCase() === '!online') {
    // Convierte el set en un array
    const playersArray = Array.from(onlinePlayers);

    if (playersArray.length === 0) {
      message.channel.send('No hay jugadores conectados en Minecraft.');
    } else {
      // Crea una cadena con los nombres
      const playersList = playersArray.join(', ');
      message.channel.send(`Jugadores conectados: ${playersList}`);
    }
  }
});


// 3.3 Iniciar sesión en Discord
discordClient.login(process.env.DISCORD_TOKEN);
