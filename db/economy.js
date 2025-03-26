// db/economy.js
const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB usando la variable de entorno MONGODB_URI
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB Atlas'))
.catch((err) => console.error('Error conectando a MongoDB Atlas:', err));

// Definir un esquema para el sistema de economía
const economySchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  points: { type: Number, default: 0 },
  lastInquisition: { type: Number, default: 0 }
});

// Crear el modelo
const Economy = mongoose.model('Economy', economySchema);

// Función para procesar el comando "!inquisition"
async function processInquisition(username) {
  const now = Date.now();
  const eightHours = 8 * 60 * 60 * 1000; // 8 horas en milisegundos

  try {
    let user = await Economy.findOne({ username });
    if (!user) {
      // Si el usuario no existe, lo crea con 25 puntos
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
    return { success: false, error: 'Error en la base de datos' };
  }
}

// Función para consultar el saldo (comando "!bank")
async function getBank(username) {
  try {
    const user = await Economy.findOne({ username });
    return user ? user.points : 0;
  } catch (error) {
    console.error('Error consultando el banco:', error);
    return 0;
  }
}

module.exports = {
  processInquisition,
  getBank
};
