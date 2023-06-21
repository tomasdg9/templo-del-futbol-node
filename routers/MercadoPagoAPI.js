const express = require('express');
const router = express.Router();
require('dotenv').config();
const axios = require('axios');

// SDK de Mercado Pago
const mercadopago = require("mercadopago");
// Agrega credenciales
mercadopago.configure({
  access_token: process.env.ACCESS_TOKEN,
});

// Ruta para procesar el pago con tarjeta
router.post('/process_payment', (req, res) => {
  const paymentData = {
    transaction_amount: req.body.amount,
    // Resto de los datos del pago
  };

  axios.post('https://api.mercadopago.com/v1/payments', paymentData, {
    headers: {
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
    },
  })
    .then(function(response) {
      const { status, status_detail, id } = response.data;
      res.status(response.status).json({ status, status_detail, id });
    })
    .catch(function(error) {
      console.error(error);
      res.status(500).json({ error: 'Error en el pago' });
    });
});

router.get('/obtener-preference-id', (req, res) => {
  // Crea la preferencia de pago
  const preferenceData = {
    items: [
      {
        title: 'Producto de ejemplo',
        quantity: 1,
        currency_id: 'ARS',
        unit_price: 100,
      },
    ],
  };

  mercadopago.preferences.create(preferenceData)
    .then((response) => {
      const preferenceId = response.body.id;
      res.json({ preferenceId });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener el preferenceId' });
    });
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