const express = require('express');
const bodyParser = require('body-parser');
const { VoiceResponse } = require('twilio').twiml;

const app = express();
const port = process.env.PORT || 3000; // Usa el puerto adecuado para Render

app.use(bodyParser.urlencoded({ extended: false }));

// Ruta inicial para la llamada
app.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();

  // Primer Gather: recopilamos la respuesta a la primera pregunta
  const gather = twiml.gather({
    numDigits: 1,
    action: '/question1', // Ruta para procesar la respuesta de la primera pregunta
    method: 'POST'
  });

  // Mensajes que la llamada dirá
  gather.say({ language: 'es-ES', voice: 'woman' }, 'Hola. Gracias por responder esta llamada. Vamos a hacerte una breve encuesta.');
  gather.say({ language: 'es-ES', voice: 'woman' }, 'Primera pregunta. ¿Te interesa empezar un curso este mes? Presiona 1 para sí, 2 para no.');

  res.type('text/xml');
  res.send(twiml.toString());
});

// Ruta para la respuesta a la primera pregunta
app.post('/question1', (req, res) => {
  const digit = req.body.Digits; // Leemos el dígito ingresado
  const twiml = new VoiceResponse();

  if (digit === '1') {
    // Si respondió '1', vamos a hacer la segunda pregunta
    const gather = twiml.gather({
      numDigits: 1,
      action: '/question2',
      method: 'POST'
    });

    gather.say({ language: 'es-ES', voice: 'woman' }, 'Excelente. Segunda pregunta. ¿Tienes el presupuesto para comenzar? Presiona 1 para sí, 2 para no.');
  } else {
    // Si respondió '2', terminamos la llamada
    twiml.say({ language: 'es-ES', voice: 'woman' }, 'Gracias por tu tiempo. Hasta luego.');
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Ruta para la respuesta a la segunda pregunta
app.post('/question2', (req, res) => {
  const digit = req.body.Digits;
  const twiml = new VoiceResponse();

  // Guardamos la respuesta, luego agradecemos y colgamos
  twiml.say({ language: 'es-ES', voice: 'woman' }, 'Gracias por tus respuestas. Un asesor se pondrá en contacto contigo pronto.');
  twiml.hangup();

  res.type('text/xml');
  res.send(twiml.toString());
});

app.listen(port, () => {
  console.log(`Servidor de encuesta corriendo en http://localhost:${port}`);
});
