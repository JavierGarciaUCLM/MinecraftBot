/*

Código ofrecido por el administrador del servidor en https://github.com/c4k3/NoSpam
Para evitar que los usuarios puedan mutear al bot dentro del propio servidor por explotación de mensajes.
Integrado totalmente por ChatGPT.

*/
// Almacena las marcas de tiempo (ms) de los últimos mensajes de cada usuario
// Ej: spamTimestamps.get(username) => [t1, t2, t3, ...]
const spamTimestamps = new Map();

// Almacena los usuarios muteados temporalmente, junto con el momento (en ms) en que se les quita el mute
// Si un usuario está muteado hasta, por ejemplo, Date.now() + 60000, significa que lo estará por 1 minuto
const mutedUsers = new Map();

/**
 * Comprueba si un usuario está spameando.
 * Devuelve true si se debe bloquear el mensaje (usuario spameando o muteado).
 * Devuelve false si se permite el mensaje.
 */
function isSpamming(username) {
  // 1. Primero, verifica si ya está muteado
  if (isMuted(username)) {
    return true; // Está muteado, bloqueamos su mensaje
  }

  const now = Date.now();
  // Carga los tiempos de mensaje anteriores
  let times = spamTimestamps.get(username);
  if (!times) {
    times = [];
  }
  // Añadimos la marca de tiempo del mensaje actual
  times.push(now);

  // Eliminamos marcas de tiempo de hace más de 15s
  while (times.length && (now - times[0]) > 15000) {
    times.shift();
  }

  // Calculamos cuántos mensajes hay en cada franja
  let shortPeriodCount = 0; // < 400ms
  let medPeriodCount = 0;   // < 1000ms
  const longPeriodCount = times.length; // < 15000ms (ya que quitamos los >15s)

  for (const t of times) {
    const diff = now - t;
    if (diff < 400) {
      shortPeriodCount++;
    }
    if (diff < 1000) {
      medPeriodCount++;
    }
  }

  // Actualizamos la lista en el Map
  spamTimestamps.set(username, times);

  // 2. Revisamos los umbrales (igual que en el plugin NoSpam)
  //    shortPeriodCount > 2  => más de 2 mensajes en <400ms
  //    medPeriodCount > 3    => más de 3 mensajes en <1000ms
  //    longPeriodCount > 7   => más de 7 mensajes en <15s
  if (shortPeriodCount > 2 || medPeriodCount > 3 || longPeriodCount > 7) {
    // Se considera spam => muteamos 1 minuto
    spamTimestamps.delete(username); // Reset de su historial de mensajes
    const unmuteTime = now + 60_000; // 1 minuto = 60000 ms
    mutedUsers.set(username, unmuteTime);

    console.log(`${username} ha sido muteado automáticamente por spam (1 min).`);
    return true;
  }

  // Si no se supera el umbral, no está spameando
  return false;
}

/**
 * Comprueba si un usuario sigue muteado.
 * Devuelve true si el usuario está muteado en este momento.
 */
function isMuted(username) {
  const now = Date.now();
  const unmuteTime = mutedUsers.get(username);

  if (!unmuteTime) {
    return false; // No está en la lista de muteados
  }

  // Si el tiempo de unmute es 0 (mute "infinito") o está en el futuro, sigue muteado
  if (unmuteTime === 0 || unmuteTime > now) {
    return true;
  }

  // Si el unmuteTime ya pasó, lo quitamos de la lista
  mutedUsers.delete(username);
  return false;
}

module.exports = {
  isSpamming,
  isMuted
};
