const express = require('express');
const router = express.Router();
const cors = require('cors');
require('dotenv').config();
router.use(cors());


var mercadopago = require('mercadopago');
mercadopago.configurations.setAccessToken(process.env.ACCESS_TOKEN);

// falta configurar esto
mercadopago.configurations.setClientId(process.env.CLIENT_ID);
mercadopago.configurations.setClientSecret(process.env.CLIENT_SECRET);

mercadopago.configure({
  access_control_allow_origin: '*',
  access_control_allow_methods: 'GET, POST',
  access_control_allow_headers: 'Authorization, Content-Type',
});

router.post('/', (req, res) => {
    mercadopago.payment.save(req.body)
      .then(function(response) {
        const { status, status_detail, id } = response.body;
        res.status(response.status).json({ status, status_detail, id });
      })
      .catch(function(error) {
        console.error(error);
      });
});

module.exports = router;
