const twilio = require('twilio');

// Reemplaza con tus credenciales reales de Twilio
const accountSid = 'AC414f4673f20f1148dc8c8a20b1d8b935';
const authToken = '3af80dbc9c5b3802c8dbf9ff23ea5f13';

const client = new twilio(accountSid, authToken);

// Número de teléfono del cliente (lead)
const toPhoneNumber = '+56997292052';  // Número del cliente (verificado en Twilio)
// Número de Twilio desde el cual llamar (debe ser tuyo)
const fromPhoneNumber = '+18449241250';  // Tu número de Twilio
const urlEncuesta = 'https://llamada-xrka.onrender.com/voice';

// Hacer la llamada con Twilio
client.calls.create({
  to: toPhoneNumber,
  from: fromPhoneNumber,
  url: urlEncuesta,  // Asegúrate de usar /voice aquí
  method: 'POST'
})
.then(call => console.log('✅ Llamada realizada. SID:', call.sid))
.catch(err => console.error('❌ Error al hacer la llamada:', err));
