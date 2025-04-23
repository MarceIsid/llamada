const twilio = require('twilio');

// Reemplaza con tus credenciales de Twilio
const accountSid = 'AC414f4673f20f1148dc8c8a20b1d8b935';  // Obténlo en el [Dashboard de Twilio](https://www.twilio.com/console)
const authToken = '3af80dbc9c5b3802c8dbf9ff23ea5f13';    // Obténlo en el [Dashboard de Twilio](https://www.twilio.com/console)

const client = new twilio(accountSid, authToken);

// El número de teléfono de destino (el lead)
const toPhoneNumber = '+56997292052';  // Número del cliente (lead)
// El número de Twilio desde el que llamar
const fromPhoneNumber = '+1 844 924 1250';  // Tu número de Twilio

// Hacer la llamada con Twilio
client.calls.create({
  to: toPhoneNumber,
  from: fromPhoneNumber,
  url: 'https://llamada-jb81.onrender.com'  // La URL que Render te da
  method: 'POST'
})
.then(call => console.log('Llamada realizada:', call.sid))
.catch(err => console.error('Error al hacer la llamada:', err));
