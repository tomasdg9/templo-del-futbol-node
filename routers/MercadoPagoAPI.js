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

router.post('/crear-preferencia', async (req, res) => {
  const { email, ids, cantidad } = req.body;
/*
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'La propiedad "ids" debe ser un arreglo' });
  }
*/
  console.log('Antes de crear la preferencia');
  let preference = {
    "purpose": "wallet_purchase",
    "payer": {
      "email": email
    },
    "back_urls": {
      "success": "https://127.0.0.1:3000",
      "failure": "https://127.0.0.1:3000/carrito",
      "pending": "https://127.0.0.1:3000/carrito"
    },
    "items": [] // Inicializar items como un arreglo vacío
  };

  try {
    const productPromises = ids.map(async (id) => {
      const response = await axios.get(`/productos/${id}`);
      const product = response.data;

      const item = {
        "id": product.id,
        "title": product.nombre,
        "quantity": 1,
        "unit_price": product.precio
      };

      preference.items.push(item);
    });

    await Promise.all(productPromises);

    mercadopago.preferences.create(preference)
      .then(function (response) {
        console.log(response);
        console.log("creando la preferencia")
        const preferenceId = response.body.id;
        res.json({ preferenceId });
      }).catch(function (error) {
        console.log(error);
        res.status(500).json({ error: 'Error en api al crear la preferencia' });
      });
  } catch (error) {
    console.error('Error al obtener los productos:', error);
    res.status(500).json({ error: 'Error en api al obtener los productos' });
  }
});

  module.exports = router;