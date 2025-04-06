const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
//Antiguamente aquí descomponía la URI, pero en nuevas versiones no va
})
.then(() => console.log('Conectado a MongoDB Atlas'))
.catch((err) => console.error('Error conectando a MongoDB Atlas:', err));

//Atributos de la BBDD
const economySchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  points: { type: Number, default: 0 },
  lastInquisition: { type: Number, default: 0 }
});

//Crea la tabla con los atributos
const Economy = mongoose.model('Economy', economySchema);

//Función para trabajar el comando "!inquisition"
async function processInquisition(username) {
  const now = Date.now();
  const eightHours = 8 * 60 * 60 * 1000; // 8 horas en milisegundos

  try {
    let user = await Economy.findOne({ username });
    if (!user) {
      user = new Economy({ username, points: 25, lastInquisition: now });
      await user.save();
      return { success: true, points: user.points };
    }
    if (now - user.lastInquisition >= eightHours) {
      user.points += 25;
      user.lastInquisition = now;
      await user.save();
      return { success: true, points: user.points };
    } else {
      const remaining = eightHours - (now - user.lastInquisition);
      return { success: false, remaining };
    }
  } catch (error) {
    console.error('Error en processInquisition:', error);
    return { success: false, error: 'Error in the DB' };
  }
}
//Función para trabajar el comando "!send"
async function sendCoins(sender, recipient, amount) {
  if (sender === recipient) {
    return { success: false, message: 'You cannot send InqCoins to yourself.' };
  }
  
  const amountNum = Number(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return { success: false, message: 'Invalid amount, must be greater than 0.' };
  }
  
  try {
    const senderUser = await Economy.findOne({ username: sender });
    if (!senderUser || senderUser.points < amountNum) {
      return { success: false, message: 'You have no InqCoins to send...' };
    }
    
    senderUser.points -= amountNum;
    await senderUser.save();
    
    let recipientUser = await Economy.findOne({ username: recipient });
    if (!recipientUser) {
      recipientUser = new Economy({ username: recipient, points: amountNum });
    } else {
      recipientUser.points += amountNum;
    }
    await recipientUser.save();
    
    return { success: true, senderPoints: senderUser.points };
  } catch (error) {
    console.error('Error en sendCoins:', error);
    return { success: false, message: 'Error in transaction.' };
  }
}

// Función para consultar el saldo (comando "!bank")
async function getBank(username) {
  try {
    const user = await Economy.findOne({ username });
    return user ? user.points : 0;
  } catch (error) {
    console.error('Error checking bank:', error);
    return 0;
  }
}

module.exports = {
  processInquisition,
  getBank,
  sendCoins
};
