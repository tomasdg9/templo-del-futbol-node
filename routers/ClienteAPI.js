const express = require('express');
const pool = require('../db'); // Ruta relativa al archivo db.js
const transporter = require('../forgotpassword'); // Archivo que contiene el email y la contraseña desde donde se envian los mails. Privado (si la catedra lo desea ver, que no los haga saber).
const crypto = require('crypto');
const { MAIL_USER } = require('../constants.js');
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
        pool.query(  // Se busca el token del usuario.
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
router.post('/register', (req, res) => {
  const { email, password, nombre, apellido } = req.body;
  const token = crypto.randomBytes(16).toString('hex');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !password || !nombre || !apellido) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }
  
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Email inválido' });
  }
  
  // Inicia la transacción
  pool.connect((error, client, done) => {
    if (error) {
      throw error;
    }
    
    try {
      client.query('BEGIN', (error) => {
        if (error) {
          throw error;
        }
        
        // Realiza la primera consulta para verificar si el email ya existe
        client.query('SELECT email FROM clientes WHERE email = $1', [email], (error, results) => {
          if (error) {
            throw error;
          }
          
          if (results.rows.length === 0) {
            // Inserta el nuevo cliente en la tabla "clientes"
            client.query('INSERT INTO clientes (email, password, nombre, apellido) VALUES ($1, $2, $3, $4)', [email, password, nombre, apellido], (error) => {
              if (error) {
                throw error;
              }
              
              // Inserta el token en la tabla "tokenclientes"
              client.query('INSERT INTO tokenclientes (email, token) VALUES ($1, $2)', [email, token], (error) => {
                if (error) {
                  throw error;
                }
                
                // commit()
                client.query('COMMIT', (error) => {
                  if (error) {
                    throw error;
                  }
                  
                  res.json({ email: email, token: token });
                });
              });
            });
          } else {
            // Credenciales repetidas
			  client.query('ROLLBACK', (error) => {
				if (error) {
				  throw error;
				}

				res.status(401).json({ message: 'Credenciales repetidas' });
			  });
          }
        });
      });
    } catch (error) {
      // Si ocurre un error, realiza un rollback para deshacer la transacción
      client.query('ROLLBACK', (rollbackError) => {
        if (rollbackError) {
          throw rollbackError;
        }
        
        throw error;
      });
    } finally {
      done();
    }
  });
});


async function enviarCorreo(destinatario, asunto, contenido) {
  try {
    const mailOptions = {
      from: MAIL_USER,
      to: destinatario,
      subject: asunto,
      text: contenido,
    };
    await transporter.sendMail(mailOptions);
    console.log('Correo enviado exitosamente');
  } catch (error) {
    console.error('Error al enviar el correo: ', error);
  }
}

// ../clientes/changepassword
// Se genera un token en la base de datos para cambiar la contraseña.
router.post('/changepassword', (req, res) => {
  const { email } = req.body;

  // Inicia la transacción
  pool.connect((error, client, done) => {
    if (error) {
      throw error;
    }

    try {
      client.query('BEGIN', (error) => {
        if (error) {
          throw error;
        }

        // Verifica si ya existe un token activo para el cliente
        client.query('SELECT * FROM tokenpassword WHERE email = $1', [email], (error, results) => {
          if (error) {
            throw error;
          }

          if (results.rows.length > 0) {
            // Ya tiene un token activo
            res.status(401).json({ message: 'Ya existe un token activo para el cliente.' });
          } else {
            // Crea un nuevo token
            const token = crypto.randomBytes(16).toString('hex');
            
            // Inserta el token en la tabla "tokenpassword"
            client.query('INSERT INTO tokenpassword (email, token) VALUES ($1, $2)', [email, token], (error) => {
              if (error) {
                throw error;
              }
              
              /* Lógica de enviar mail */
              enviarCorreo(email, 'Cambiar contraseña - El templo del Fútbol', 'Ingresa al siguiente link para cambiar la contraseña: http://localhost:3000/cambiarcontra/' + email + '/' + token);
              
              res.json({ message: 'Se envió un correo electrónico al cliente' });
            });
          }
        });
      });
    } catch (error) {
      // Si ocurre un error, realiza un rollback para deshacer la transacción
      client.query('ROLLBACK', (rollbackError) => {
        if (rollbackError) {
          throw rollbackError;
        }

        throw error;
      });
    } finally {
      done();
    }
  });
});


// ../clientes/newpassword
// ... A esta dirección se debe enviar la nueva contraseña para cambiarla. (También se debe enviar el email y el token)
router.post('/newpassword', (req, res) => {
  const { email, token, password } = req.body;
  // Inicia la transacción
  pool.connect((error, client, done) => {
    if (error) {
      throw error;
    }

    try {
      client.query('BEGIN', (error) => {
        if (error) {
          throw error;
        }

        // Verifica si el token es válido para el email
        client.query(
          'SELECT * FROM tokenpassword WHERE email = $1 AND token = $2',
          [email, token],
          (error, results) => {
            if (error) {
              throw error;
            }

            if (results.rows.length > 0) {
              // Token válido
              // Actualiza la contraseña del cliente
              client.query(
                'UPDATE clientes SET password = $1 WHERE email = $2',
                [password, email],
                (error) => {
                  if (error) {
                    throw error;
                  }

                  // Elimina el token de la tabla "tokenpassword"
                  client.query(
                    'DELETE FROM tokenpassword WHERE email = $1',
                    [email],
                    (error) => {
                      if (error) {
                        throw error;
                      }

                      res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
                    }
                  );
                }
              );
            } else {
              // Token inválido
               client.query('ROLLBACK', (error) => {
				if (error) {
				  throw error;
				}

				res.status(404).json({ message: 'El token es inválido.' });
			  });
            }
          }
        );
      });
    } catch (error) {
      // Si ocurre un error, realiza un rollback para deshacer la transacción
      client.query('ROLLBACK', (rollbackError) => {
        if (rollbackError) {
          throw rollbackError;
        }

        throw error;
      });
    } finally {
      done();
    }
  });
});

  
module.exports = router;
