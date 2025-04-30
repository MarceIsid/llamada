const twilio = require('twilio');

// Reemplaza con tus credenciales reales de Twilio
const accountSid = 'AC414f4673f20f1148dc8c8a20b1d8b935';
const authToken = '592f6f2bd49a06e33f37ef00b86eb79f';

const client = new twilio(accountSid, authToken);

// Número de teléfono del cliente (lead)
const toPhoneNumber = '+56997292052';  // Número del cliente (verificado en Twilio)
// Número de Twilio desde el cual llamar (debe ser tuyo)
const fromPhoneNumber = '+18449241250'; 
const urlEncuesta = 'https://llamada-xrka.onrender.com/voice';

// Hacer la llamada con Twilio
client.calls.create({
  to: toPhoneNumber,
  from: fromPhoneNumber,
  url: urlEncuesta,
  method: 'POST',
  
  statusCallbackMethod: 'POST',
  statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
})
.then(call => {
  console.log('✅ Llamada realizada. SID:', call.sid);
  console.log('📞 Número llamado:', toPhoneNumber);
  console.log('📱 Número de origen:', fromPhoneNumber);
})
.catch(err => {
  console.error('❌ Error al hacer la llamada:', err);
  console.error('Detalles:', err.message);
});
