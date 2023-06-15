// validar el metodo crear pedido con el token que tiene en las cookies el cliente.
const express = require('express');
const pool = require('../db'); // Ruta relativa al archivo db.js
const { validationResult } = require('express-validator');
const router = express.Router();


// ../pedidos/detalle/{id}/{email}/{token}
// Debería retornar información sobre los productos que pidió el cliente en dicho pedido. 
// Ver los detalles de un pedido en la aplicación de Laravel para guiarme.

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

  pool.query(
    'SELECT * FROM pedidos WHERE id = $1',
    [id],
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

// PROBAR
// ../pedidos/crear/{token}
router.post('/crear/:token', async (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
	  return res.status(422).json({
		message: 'Error al crear el pedido',
		errors: errors.array(),
	  });
	}
  
	const token = req.params.token;
	const email = req.body.email;
  
	try {
	  await db.beginTransaction(); // Iniciar transacción
  
	  // Verificar si existe una entrada en la tabla "tokenclientes" con el email y el token proporcionados
	  const tokenQuery = 'SELECT COUNT(*) AS count FROM tokenclientes WHERE email = ? AND token = ?';
	  const tokenParams = [email, token];
	  const [tokenRows] = await db.query(tokenQuery, tokenParams);
	  const count = tokenRows[0].count;
  
	  if (count === 0) {
		await db.rollback(); // Revertir la transacción
		return res.status(401).json({
		  mensaje: 'Credenciales inválidas',
		});
	  }
  
	  // Guardar el pedido en la tabla correspondiente
	  const descripcion = req.body.descripcion;
	  const pedidoQuery = 'INSERT INTO pedidos (email, descripcion) VALUES (?, ?)';
	  const pedidoParams = [email, descripcion];
	  await db.query(pedidoQuery, pedidoParams);
  
	  const idsArray = req.body.ids.split('-');
	  const insufficientStock = [];
	  let noDisponible = false;
  
	  for (const element of idsArray) {
		// Obtener el producto de la base de datos
		const productoQuery = 'SELECT * FROM productos WHERE id = ?';
		const productoParams = [element];
		const [productoRows] = await db.query(productoQuery, productoParams);
		const producto = productoRows[0];
  
		if (producto.stock > 0) {
		  // Guardar el detalle del pedido en la tabla correspondiente
		  const detallePedidoQuery = 'INSERT INTO detalle_pedidos (pedido_id, producto_id, precio) VALUES (?, ?, ?)';
		  const detallePedidoParams = [pedidoId, element, producto.precio];
		  await db.query(detallePedidoQuery, detallePedidoParams);
  
		  if (!producto.activo) {
			noDisponible = true;
		  }
  
		  // Reducir el stock del producto en la base de datos
		  const updateStockQuery = 'UPDATE productos SET stock = stock - 1 WHERE id = ?';
		  const updateStockParams = [element];
		  await db.query(updateStockQuery, updateStockParams);
		} else {
		  insufficientStock.push(element);
		}
	  }
  
	  if (insufficientStock.length > 0) {
		await db.rollback(); // Revertir la transacción
		return res.status(422).json({
		  mensaje: 'Error al crear el pedido',
		  insufficientStock: insufficientStock,
		});
	  }
  
	  if (noDisponible) {
		await db.rollback(); // Revertir la transacción
		return res.status(422).json({
		  mensaje: 'Error al crear el pedido',
		  noDisponible: noDisponible,
		});
	  }
  
	  await db.commit(); // Confirmar la transacción
  
	  return res.json({
		mensaje: 'Pedido creado con éxito',
	  });
	} catch (error) {
	  await db.rollback(); // Revertir la transacción en caso de error
  
	  return res.status(500).json({
		mensaje: 'Error al crear el pedido',
	  });
	}
  });
  

// PROBAR.
// PREGUNTAR: Antes usabamos /pedidos/id pero lo vemos que no es necesario porque no tenemos el id del cliente, si no el email en las cookies, podemos no agregarlo?
// ../pedidos/email/{email}/{token} -> Solicita los pedidos de un cliente según su email. Se necesita el token.
router.get('/email/:email/:token', (req, res) => {
	const { email, token } = req.params;
	pool.query('SELECT * FROM tokenclientes WHERE email = $1 and token = $2', [email, token], (error, results) => { // Valida si el email tiene el token correcto.
		if (error) {
        throw error;
      }
	  if(results.rows.length == 0) {
		  res.status(404).json({
			  mensaje: 'Token inválido'
			});
	 } else {
		  pool.query('SELECT * FROM pedidos WHERE email = $1', [email], (error2, results2) => {
		  if (error2) {
			throw error2;
		  }
		  if(results2.rows.length > 0){
		  res.json(results2.rows);
		  } else{
			  res.status(404).json({
			  mensaje: 'Cliente no encontrado'
			});
		}
		});
	}
	
	});
    
});

// ../pedidos/page/{page}
router.get('/page/:page', (req, res) => {
	const { page } = req.params;
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