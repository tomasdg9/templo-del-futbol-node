const express = require('express');
const router = express.Router();
require('dotenv').config();
// SDK de Mercado Pago
const mercadopago = require("mercadopago");
// Agrega credenciales
mercadopago.configure({
  access_token: process.env.ACCESS_TOKEN,
});

// Crear un objeto de preferencia
router.post('/crear-preferencia', (req, res) => {
    let preference = {
    // el "purpose": "wallet_purchase" solo permite pagos registrados
    // para permitir pagos de guests puede omitir esta propiedad
    "purpose": "wallet_purchase",
    "items": [
      {
        "id": "item-ID-1234",
        "title": "Meu produto",
        "quantity": 1,
        "unit_price": 75.76
      }
    ]
  };
  
  mercadopago.preferences.create(preference)
    .then(function (response) {
      // Este valor es el ID de preferencia que se enviará al ladrillo al inicio
      const preferenceId = response.body.id;
      res.json({preferenceId});
    }).catch(function (error) {
      console.log(error);
      res.status(500).json({ error: 'Error al crear la preferencia' });
    });
  });

  module.exports = router;