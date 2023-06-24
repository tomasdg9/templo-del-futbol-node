const express = require('express');
const pool = require('../db'); // Ruta relativa al archivo db.js
const { validationResult } = require('express-validator');
const router = express.Router();

// ../pedidos/process_payment
/*var mercadopago = require('mercadopago');
mercadopago.configurations.setAccessToken(process.env.ACCESS_TOKEN);
router.post('/process_payment', (req, res) => {
    mercadopago.payment.save(req.body)
      .then(function(response) {
        const { status, status_detail, id } = response.body;
        res.status(response.status).json({ status, status_detail, id });
      })
      .catch(function(error) {
        console.error(error);
      });
});
*/
// ../pedidos/
router.get('/', (req, res) => {
    pool.query('SELECT * FROM pedidos', (error, results) => {
      if (error) {
        throw error;
      }
      res.json(results.rows);
    });
  });

// ../pedidos/{id}
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const idNumber = parseInt(id, 10);
  if (isNaN(idNumber) || idNumber < 0) {
    res.status(400).json({ mensaje: 'El ID debe ser un número mayor o igual a cero' });
    return;
  }
  pool.query(
    'SELECT * FROM pedidos WHERE id = $1',
    [idNumber],
    (error, results) => {
      if (error) {
        throw error;
      }

      if (results.rows.length > 0) {
        const cliente = results.rows[0];
        res.json(cliente);
      } else {
        res.status(404).json({ mensaje: 'Cliente no encontrado' });
      }
    }
  );
});


// ../pedidos/crear/{token}
router.post('/crear/:token', (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Error al crear el pedido',
      errors: errors.array(),
    });
  }

  const { token } = req.params;
  const email = req.body.email;
  pool.connect((error, client, done) => {
    if (error) {
      throw error;
    }

    client.query('BEGIN', (error) => {
      if (error) {
        client.query('ROLLBACK', (rollbackError) => {
          if (rollbackError) {
            throw rollbackError;
          }
          throw error;
        });
      }

      const tokenQuery = 'SELECT COUNT(*) AS count FROM tokenclientes WHERE email = $1 AND token = $2';
      const tokenParams = [email, token];
      client.query(tokenQuery, tokenParams, (error, tokenResult) => {
        if (error) {
          client.query('ROLLBACK', (rollbackError) => {
            if (rollbackError) {
              throw rollbackError;
            }
            throw error;
          });
        }

        const count = tokenResult.rows[0].count;

        if (count === 0) {
          console.log("token invalido");
          client.query('ROLLBACK', (rollbackError) => {
            if (rollbackError) {
              throw rollbackError;
            }
            return res.status(401).json({
              mensaje: 'Credenciales inválidas',
            });
          });
        }

        const descripcion = req.body.descripcion;
		const fechaActual = new Date();
        const pedidoQuery = 'INSERT INTO pedidos (email, descripcion, created_at, updated_at) VALUES ($1, $2, $3, $3) RETURNING id';
        const pedidoParams = [email, descripcion, fechaActual];
        client.query(pedidoQuery, pedidoParams, (error, pedidoResult) => {
          if (error) {
            client.query('ROLLBACK', (rollbackError) => {
              if (rollbackError) {
                throw rollbackError;
              }
              throw error;
            });
          }

          const pedidoId = pedidoResult.rows[0].id;
          const idsArray = req.body.ids.split('-');
          const insufficientStock = [];
          let noDisponible = false;
          let queryCount = 0;

          idsArray.forEach((element) => {
            const productoQuery = 'SELECT * FROM productos WHERE id = $1';
            const productoParams = [element];
            client.query(productoQuery, productoParams, (error, productoResult) => {
              if (error) {
                client.query('ROLLBACK', (rollbackError) => {
                  if (rollbackError) {
                    throw rollbackError;
                  }
                  throw error;
                });
              }

              const producto = productoResult.rows[0];

              if (producto.stock > 0) {
                const detallePedidoQuery = 'INSERT INTO detalle_pedidos (pedido_id, producto_id, precio) VALUES ($1, $2, $3)';
                const detallePedidoParams = [pedidoId, element, producto.precio];
                client.query(detallePedidoQuery, detallePedidoParams, (error) => {
                  if (error) {
                    client.query('ROLLBACK', (rollbackError) => {
                      if (rollbackError) {
                        throw rollbackError;
                      }
                      throw error;
                    });
                  }

                  if (!producto.activo) {
                    noDisponible = true;
                  }

                  const updateStockQuery = 'UPDATE productos SET stock = stock - 1 WHERE id = $1';
                  const updateStockParams = [element];
                  client.query(updateStockQuery, updateStockParams, (error) => {
                    if (error) {
                      client.query('ROLLBACK', (rollbackError) => {
                        if (rollbackError) {
                          throw rollbackError;
                        }
                        throw error;
                      });
                    }

                    queryCount++;

                    if (queryCount === idsArray.length) {
                      if (insufficientStock.length > 0) {
                        client.query('ROLLBACK', (rollbackError) => {
                          if (rollbackError) {
                            throw rollbackError;
                          }
                          return res.status(422).json({
                            mensaje: 'Error al crear el pedido',
                            insufficientStock: insufficientStock,
                          });
                        });
                      } else if (noDisponible) {
                        client.query('ROLLBACK', (rollbackError) => {
                          if (rollbackError) {
                            throw rollbackError;
                          }
                          return res.status(422).json({
                            mensaje: 'Error al crear el pedido',
                            noDisponible: noDisponible,
                          });
                        });
                      } else {
                        client.query('COMMIT', (error) => {
                          if (error) {
                            client.query('ROLLBACK', (rollbackError) => {
                              if (rollbackError) {
                                throw rollbackError;
                              }
                              throw error;
                            });
                          }
                          return res.json({
                            mensaje: 'Pedido creado con éxito',
                          });
                        });
                      }
                    }
                  });
                });
              } else {
                insufficientStock.push(element);
                queryCount++;

                if (queryCount === idsArray.length) {
                  if (insufficientStock.length > 0) {
                    client.query('ROLLBACK', (rollbackError) => {
                      if (rollbackError) {
                        throw rollbackError;
                      }
                      return res.status(422).json({
                        mensaje: 'Error al crear el pedido',
                        insufficientStock: insufficientStock,
                      });
                    });
                  } else if (noDisponible) {
                    client.query('ROLLBACK', (rollbackError) => {
                      if (rollbackError) {
                        throw rollbackError;
                      }
                      return res.status(422).json({
                        mensaje: 'Error al crear el pedido',
                        noDisponible: noDisponible,
                      });
                    });
                  } else {
                    client.query('COMMIT', (error) => {
                      if (error) {
                        client.query('ROLLBACK', (rollbackError) => {
                          if (rollbackError) {
                            throw rollbackError;
                          }
                          throw error;
                        });
                      }

                      return res.json({
                        mensaje: 'Pedido creado con éxito',
                      });
                    });
                  }
                }
              }
            });
          });
        });
      });
    });
  });
});

// ../pedidos/email/{email}/{token} -> Solicita los pedidos de un cliente según su email. Se necesita el token.
router.get('/email/:email/:token', (req, res) => {
  const { email, token } = req.params;
  pool.query('SELECT * FROM tokenclientes WHERE email = $1 and token = $2', [email, token], (error, results) => { // Valida si el email tiene el token correcto.
    if (error) {
      throw error;
    }
    if (results.rows.length == 0) {
      res.status(404).json({
        mensaje: 'Token inválido'
      });
    } else {
      pool.query(`
        SELECT p.*, COUNT(dp.*) as cantidadproductos
        FROM pedidos p
        LEFT JOIN detalle_pedidos dp ON p.id = dp.pedido_id
        WHERE p.email = $1
        GROUP BY p.id
      `, [email], (error2, results2) => {
        if (error2) {
          throw error2;
        }
        if (results2.rows.length > 0) {
          res.json(results2.rows);
        } else {
			res.status(401).json({
				mensaje: 'El cliente no tiene pedidos.'
			});
		}
      });
    }
  });
});

// ../pedidos/verdetalle/{id}
router.get('/verdetalle/:id', (req, res) => {
  const { id } = req.params;
  const idNumber = parseInt(id, 10);
  if (isNaN(idNumber) || idNumber < 0) {
    res.status(400).json({ mensaje: 'El ID debe ser un número mayor o igual a cero' });
    return;
  }
  pool.query('SELECT * FROM detalle_pedidos WHERE pedido_id = $1', [id], (error, results) => {
    if (error) {
      throw error;
    }
    if (results.rows.length > 0) {
      const productIds = results.rows.map(row => row.producto_id);
      pool.query(`
        SELECT pr.nombre as nombre_producto, c.nombre as nombre_categoria, dp.precio, pr.imagen, COUNT(*) as cantidadpedida
        FROM productos pr
        INNER JOIN detalle_pedidos dp ON pr.id = dp.producto_id
        INNER JOIN categorias c ON pr.categoria_id = c.id
        WHERE dp.pedido_id = $1
        GROUP BY pr.id, c.nombre, dp.precio
      `, [id], (error2, results2) => {
        if (error2) {
          throw error2;
        }
        res.json(results2.rows);
      });
    } else {
      res.status(404).json({
        mensaje: 'No se encontró detalle para el pedido especificado'
      });
    }
  });
});

// ../pedidos/page/{page}
router.get('/page/:page', (req, res) => {
	const { page } = req.params;
	const idNumber = parseInt(page, 10);
	if (isNaN(idNumber) || idNumber < 1) {
		res.status(400).json({ mensaje: 'La página tiene que empezar por la 1.' });
		return;
	}
	const pageAux = page - 1;
	const limit = 6;
	const offset = limit * pageAux;
	pool.query('SELECT * FROM pedidos ORDER BY id ASC OFFSET $1 LIMIT $2', [offset, limit])
	  .then((result) => {
		const pedidos = result.rows;
		if (pedidos.length === 0) {
		  res.status(404).json({
			mensaje: 'Página de pedidos no encontrada'
		  });
		} else {
		  res.json(pedidos);
		}
	  })
	  .catch((error) => {
		throw error;
	  });
});
  
 module.exports = router;