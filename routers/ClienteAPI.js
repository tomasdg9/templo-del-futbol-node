const express = require('express');
const pool = require('../db'); // Ruta relativa al archivo db.js
const transporter = require('../forgotpassword'); // Archivo que contiene el email y la contraseña desde donde se envian los mails. Privado (si la catedra lo desea ver, que no los haga saber).
const crypto = require('crypto');

const router = express.Router();

// ../clientes/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  pool.query(
    'SELECT email FROM clientes WHERE email = $1 AND password = $2',
    [email, password],
    (error, results) => {
      if (error) {
        throw error;
      }

      if (results.rows.length > 0) {
        const userEmail = results.rows[0].email;

        // Se busca el token del usuario.
        pool.query(
          'SELECT * FROM tokenclientes WHERE email = $1',
          [userEmail],
          (error, results2) => {
            if (error) {
              throw error;
            }
			const userToken = results2.rows[0].token;
            res.json({ email: userEmail, token: userToken });
          }
        );
      } else {
        res.status(401).json({ message: 'Credenciales inválidas' });
      }
    }
  );
});

// ../clientes/register
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Expresión regular para validar el formato del email

router.post('/register', (req, res) => {
  const { email, password, nombre, apellido } = req.body;
  const token = crypto.randomBytes(16).toString('hex'); // Generar un token aleatorio

  if (!email || !password || !nombre || !apellido) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }
  
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Email inválido' });
  }
  
  pool.query(
    'SELECT email FROM clientes WHERE email = $1',
    [email],
    (error, results) => {
      if (error) {
        throw error;
      }
	  
      if (results.rows.length == 0) {

		pool.query('INSERT INTO clientes (email, password, nombre, apellido) VALUES ($1, $2, $3, $4)',
					[email, password, nombre, apellido],
			(error, results) => {
			  if (error) {
				throw error;
			  }
			 }
		);		
        // Guardar el token en la tabla "tokenclientes" -> es un único token por usuario.
        pool.query(
          'INSERT INTO tokenclientes (email, token) VALUES ($1, $2)',
          [email, token],
          (error) => {
            if (error) {
              throw error;
            }

            res.json({ email: email, token: token });
          }
        );
      } else {
        res.status(401).json({ message: 'Credenciales repetidas' });
      }
    }
  );
});

async function enviarCorreo(destinatario, asunto, contenido) {
  try {
    const mailOptions = {
      from: 'nicolas.berti69@gmail.com',
      to: destinatario,
      subject: asunto,
      text: contenido,
    };

    await transporter.sendMail(mailOptions);
    console.log('Correo enviado exitosamente');
  } catch (error) {
    console.error('Error al enviar el correo:', error);
  }
}

// ../clientes/changepassword
// Se genera un token en la base de datos para cambiar la contraseña.
router.post('/changepassword', (req, res) => {
  const { email } = req.body;
  pool.query(
    'SELECT * FROM tokenpassword WHERE email = $1',
    [email],
    (error, results) => {
      if (error) {
        throw error;
      }
      if (results.rows.length > 0) {
        // Ya tiene un token activo
		res.status(401).json({ message: 'Ya existe un token activo para el cliente.' });
      } else {
        // Crear un token.
		const token = crypto.randomBytes(16).toString('hex'); // Generar un token aleatorio
		pool.query('INSERT INTO tokenpassword (email, token) VALUES ($1, $2)',
					[email, token],
			(error, results) => {
			  if (error) {
				throw error;
			  }
			  /* Lógica de enviar mail */
			  enviarCorreo(email, 'Cambiar contraseña - El templo del Fútbol', 
			  'Ingresa al siguiente link para cambiar la contraseña: http://localhost:3000/cambiarcontra/'+email+'/'+token
			  );
			  res.json({ message: "Se envió un mail al cliente" });
			 }
		);	
      }
    }
  );
});

// ../clientes/newpassword
// ... A esta dirección se debe enviar la nueva contraseña para cambiarla. (También se debe enviar el email y el token)
router.post('/deletetoken', (req, res) => {
  const { email, token, password } = req.body;
  // 1. Verificar que el token sea válido para dicho email.
  pool.query(
    'SELECT * FROM tokenpassword WHERE email = $1 and token = $2',
    [email, token],
    (error, results) => {
      if (error) {
        throw error;
      }
      if (results.rows.length > 0) {
        // Token válido.
		const contraseñaEncriptada = md5(password); // Utiliza el algoritmo MD5 para encriptarla

		pool.query(
		  'UPDATE clientes SET password = $1 WHERE email = $2',
		  [contraseñaEncriptada, email],
		  (error, results) => {
			if (error) {
			  throw error;
			}
			res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
		  }
		);
		
      } else {
        // Tokén inválido
		res.status(404).json({ message: 'El token es inválido.' });
      }
    }
  );
  
});

// ../clientes/deletetoken
// Se elimina el token de la base de datos porque ya cambió la contraseña.
router.post('/deletetoken', (req, res) => {
  const { email } = req.body;
  pool.query(
    'DELETE FROM tokenpassword WHERE email = $1',
    [email],
    (error, results) => {
      if (error) {
        throw error;
      }
      res.sendStatus(200);
    }
  );
});




// no va. repetido
// ../clientes/pedidos/{email}/{token}
/*router.get('/pedidos/:email/:token', (req, res) => {
    const { email, token } = req.params;
	pool.query('SELECT * FROM tokenclientes WHERE email = $1 and token = $2', [email, token], (error, results) => { // Valida el token
      if (error) {
        throw error;
      }
	  if(results.rows.length > 0){
		   pool.query('SELECT * FROM pedidos WHERE email = $1', [email], (error, results) => {
			  if (error) {
				throw error;
			  }
			  res.json(results.rows); // Devuelve los pedidos.
			});
		}
    });
	
   
 });*/
  
module.exports = router;
