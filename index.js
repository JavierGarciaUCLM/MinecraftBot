const mineflayer = require('mineflayer');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config(); // Carga variables del .env
const { isSpamming } = require('./spamProtection');
const duelQueue = { active: false, challenger: null, amount: 0, timeout: null }; 
const { processInquisition, getBank, sendCoins, getTop, setWelcomeMessage, getWelcomeMessage } = require('./db/economy');
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});


let mcBot;
const onlinePlayers = new Set(); //Set de users, usado pa el !online, por ejemplo
const entraWorld = /^(.+?) is now entering the pvp world\.?$/i;
const saleWorld = /^(.+?) is now leaving the pvp world\.?$/i;
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
  'Sleepobot was such a NERD',
  'MARCOS SUELTA EL CALCETIN',
  'Hasta los cojones de pretender que no soy español… chipi traeme una caña',
  'I griefed 3words',
  'QUAGSMARIA is ETERNAL',
  'Este malagueño folla como un toro, y sin usar pastillas!',
  'Que si power que ya te hemos visto',
  'We love you, PowerHamad',
  'Flxtrjr PvP logged to escape chipinazo?!?!?',
  'We hate ImCh1ef!',
  'Love Spain or Spain will come to you...',
  'It has been a long time without doing !inq',
  'Try out the new !help command!',
  'Spanish Inquisition wouldnt ask for your main base cords!',
  'If you ever see PowerXInfinito, run away from him!'
];


function createMinecraftBot() {
  mcBot = mineflayer.createBot({
    host: process.env.MC_HOST,
    port: Number(process.env.MC_PORT),
    username: process.env.MC_USERNAME,
    auth: 'microsoft',
    refreshToken: process.env.REFRESH_TOKEN,
    version: '1.21.7'
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
    //Los 5 segundos son para evitar repeticiones
    setTimeout(() => {
      initialLoad = false;
      console.log('Finalizada la carga inicial de jugadores.');
    }, 5000);
      // Esto es lo de enviar los mensajes randoms
    setInterval(enviarMensajeAleatorio, 20 * 60 * 1000);
  });

  mcBot.on('end', () => {
    console.log('El bot de Minecraft se ha desconectado.');
  });

  mcBot.on('playerJoined', async (player) => {
    if (initialLoad) return;
  
    const name = player.username;
  
 
    if (!onlinePlayers.has(name)) {
      onlinePlayers.add(name);
  
      try {
        const welcome = await getWelcomeMessage(name);   
        if (welcome) mcBot.chat(welcome);
      } catch (e) {
        console.error('Error leyendo welcome:', e);
      }
    }
  

    const channel = discordClient.channels.cache.get(process.env.CHANNEL_ID);
    if (channel) channel.send(`${player.username} se ha unido al servidor de Minecraft.`);
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

  mcBot.on('chat', async (username, message) => {
    
  //No funciona el antispam, cómo puedo solucionarlo?
    if (isSpamming(username)) {
      mcBot.whisper(username, "You are muted for spam. Wait a minute before talking to the bot.");
      return;
    }

    const fightMatch = message.match(/^!fight\s+(\d+)$/i);
if (fightMatch) {
  const amount = Number(fightMatch[1]);

  if (duelQueue.active) {
    mcBot.chat(`${username}, There's a fight in progress. Wait until it finishes.`);
    return;
  }
  if (amount <= 0 || Number.isNaN(amount)) {
    mcBot.chat(`${username}, must be an amount higher than 0.`);
    return;
  }

  try {
    const saldo = await getBank(username);
    if (saldo < amount) {
      mcBot.chat(`${username}, you dont have enough InquiCoins (Bank: ${saldo}).`);
      return;
    }
  } catch (e) {
    mcBot.chat(`${username}, error consulting your InquiCoins.`);
    console.error(e);
    return;
  }

  duelQueue.active      = true;
  duelQueue.challenger  = username;
  duelQueue.amount      = amount;

  mcBot.chat(`${username} is fighting somebody who says !accept for ${amount} InquiCoins. 1 minute to end!`);

  duelQueue.timeout = setTimeout(() => {
    duelQueue.active = false;
    mcBot.chat(`Time has ended: fight of ${username} has finished.`);
  }, 1 * 60 * 1000);

  return;
}

if (message.toLowerCase() === '!accept') {
  if (!duelQueue.active) {
    mcBot.chat(`${username}, nobody is fighting right now...`);
    return;
  }
  if (username === duelQueue.challenger) {
    mcBot.chat(`${username}, you cannot fight yourself.`);
    return;
  }

  const amount = duelQueue.amount;
  const challenger = duelQueue.challenger;
  const opponent   = username;

  clearTimeout(duelQueue.timeout);
  duelQueue.active = false;

  try {
    const [saldoCh, saldoOp] = await Promise.all([getBank(challenger), getBank(opponent)]);
    if (saldoCh < amount || saldoOp < amount) {
      mcBot.chat(`One of the player doesnt have enough InquiCoins. Fight is over.`);
      return;
    }
  } catch (e) {
    mcBot.chat(`Error checking bank, try again.`);
    console.error(e);
    return;
  }

  const winner = Math.random() < 0.5 ? challenger : opponent;
  const loser  = winner === challenger ? opponent : challenger;

  try {
    await Promise.all([
      transferCoins(loser, winner, amount),      
      transferCoins(winner, winner,  amount)    
    ]);

    mcBot.chat(`${winner} wins the fight and takes ${amount * 2} InquiCoins!`);
  } catch (e) {
    mcBot.chat(`There was an error moving your coins. Contact to chipinazo.`);
    console.error(e);
  }
  return;
}

    const jmMatch = message.match(/^!jm\s+(\S+)\s+(.+)/i);
    if (jmMatch) {
      const target   = jmMatch[1];
      const newMsg   = jmMatch[2]

      const { setWelcomeMessage } = require('./db/economy');
      const result = await setWelcomeMessage(username, target, newMsg);

    if (result.success) {
      mcBot.chat(`${username}, join message set to ${target}. Your new balance: ${result.senderPoints} InqCoins.`);
    } else {
      mcBot.chat(`${username}, error: ${result.message}`);
    }
  return;
}
  
    // Enviar el mensaje a Discord
    const channel = discordClient.channels.cache.get(process.env.CHANNEL_ID);
    if (channel) {
      if (username === mcBot.username) {
        channel.send(`[Bot de Minecraft] ${message}`);
      } else {
        channel.send(`[${username}] ${message}`);
      }
    }

    if (message.toLowerCase() === '!help'){
      mcBot.chat(`/msg ${username} !inq, !send (name) (quantity) || !bank: Check your InquiCoins || !top: Top 3 Holders || !jm (name) (message): Set a join message || !fight (quantity): Start a fight with another player, !accept to accept.`);
    }
  
    if (message.toLowerCase() === '!inq') {
      processInquisition(username)
        .then(result => {
          if (result.success) {
            mcBot.chat(`${username}, you have received 25 InquiCoins. Your total bank account is ${result.points}.`);
          } else if (result.remaining !== undefined) {
            const minutes = Math.ceil(result.remaining / (60 * 1000));
            mcBot.chat(`${username}, please wait ${minutes} minutes before receiving more InquiCoins.`);
          } else {
            mcBot.chat(`${username}, there was an error processing your request.`);
          }
        })
        .catch(err => {
          console.error('Error en !inquisition:', err);
          mcBot.chat(`${username}, there was an error processing your request.`);
        });
    }

    if (message.toLowerCase().startsWith('!send ')) {
      const parts = message.split(' ');
      if (parts.length < 3) {
        mcBot.chat(`${username}, there was an error, use: !send (name) (quantity)`);
        return;
      }
      
      const recipient = parts[1];
      const amount = Number(parts[2]);
      
      if (isNaN(amount) || amount <= 0) {
        mcBot.chat(`${username}, amount to be sent must be greater than 0.`);
        return;
      }
      
      sendCoins(username, recipient, amount)
        .then(result => {
          if (result.success) {
            mcBot.chat(`${username}, has sent ${amount} InquiCoins to ${recipient}. Your new bank amount is ${result.senderPoints}.`);
          } else {
            mcBot.chat(`${username}, error: ${result.message}`);
          }
        })
        .catch(err => {
          console.error('Error al procesar !send:', err);
          mcBot.chat(`${username}, there was an error in the transaction.`);
        });
      
      return;
    }
  
    if (message.toLowerCase().startsWith('!bank')) {
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

    if (message.toLowerCase() === '!top') {
      getTop()
        .then(topUsers => {
          if (!topUsers || topUsers.length === 0) {
            mcBot.chat(`${username}, no hay usuarios registrados aún.`);
            return;
          }
          let reply = "Top 3 InqCoins:";
          topUsers.forEach((user, index) => {
            reply += ` ${index + 1}. ${user.username}: ${user.points} InqCoins;`;
          });
          mcBot.chat(reply);
        })
        .catch(err => {
          console.error('Error en !top:', err);
          mcBot.chat(`${username}, error procesando el comando !top.`);
        });
      return;
    }
  });
}


createMinecraftBot();

discordClient.once('ready', () => {
  console.log(`Bot de Discord conectado como ${discordClient.user.tag}`);
});

discordClient.on('messageCreate', async (message) => {
  if (message.author.bot) return; // Ignora los mensajes del propio bot

  if (message.content.startsWith('!say ')) {
    const msg = message.content.slice(5).trim(); //Extrae el texto luego de "!say "
    if (mcBot && mcBot.player) {
      mcBot.chat(msg);
      message.channel.send(`He enviado el mensaje al servidor: "${msg}"`);
    } else {
      message.channel.send(`El bot de Minecraft no está conectado actualmente.`);
    }
  }


  if (message.content.toLowerCase() === '!online') {
    const playersArray = Array.from(onlinePlayers);

    if (playersArray.length === 0) {
      message.channel.send(`No hay jugadores conectados en Minecraft.`);
    } else {
      const playersList = playersArray.join(', ');
      message.channel.send(`Jugadores conectados: ${playersList}`);
    }
  }
});

mcBot.on('message', (message, position) => {

  const messageText = message.toString();

  const enterMatch = messageText.match(entraWorld);
  if (enterMatch) {
    const playerName = enterMatch[1].trim();
    const channel = discordClient.channels.cache.get(process.env.CHANNEL_ID);
    if (channel) {
      channel.send(`${playerName} **acaba de entrar** a World.`);
    }
    return;
  }

  const leaveMatch = messageText.match(saleWorld);
  if (leaveMatch) {
    const playerName = leaveMatch[1].trim();
    const channel = discordClient.channels.cache.get(process.env.CHANNEL_ID);
    if (channel) {
      channel.send(`${playerName} **acaba de salir** de World.`);
    }
    return;
  }
});

async function transferCoins(fromUser, toUser, amount) {
  if (fromUser === toUser) {
    return;
  }
  const result = await sendCoins(fromUser, toUser, amount);
  if (!result.success) throw new Error(result.message);
}

discordClient.login(process.env.DISCORD_TOKEN);