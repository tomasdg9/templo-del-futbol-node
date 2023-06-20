const express = require('express');
const pool = require('../db'); // Ruta relativa al archivo db.js

const router = express.Router();

// ../productos/
router.get('/', (req, res) => {
  pool.query('SELECT * FROM productos', (error, results) => {
    if (error) {
      throw error;
    }
    res.json(results.rows);
  });
});

// ../productos/buscar/{name} -- OBS: Se rompe si se pasa name vacio, preguntar en la práctica.
router.get('/buscar/:name', (req, res) => {
  const { name } = req.params;
    pool.query('SELECT * FROM productos WHERE LOWER(nombre) = LOWER($1) AND activo = true', [name], (error, results) => {
      if (error) {
        throw error;
      }
      const productos = result.rows;
      if(productos.length == 0){
        res.status(404).json({
          mensaje: 'Producto no encontrado'
        });
      } else 
        res.json(results.rows);
    });
});

// ../productos/filtrar
router.get('/filtrar', (req, res) => {
  pool.query('SELECT p.* FROM productos p INNER JOIN categorias c ON p.categoria_id = c.id WHERE p.activo = true AND c.visible = true', (error, results) => {
    if (error) {
      throw error;
    }
    res.json(results.rows);
  });
});

// ../productos/masnuevos
router.get('/masnuevos', (req, res) => {
  pool.query('SELECT p.* FROM productos p INNER JOIN categorias c ON p.categoria_id = c.id WHERE p.activo = true AND c.visible = true ORDER BY p.created_at DESC LIMIT 4', (error, results) => {
    if (error) {
      throw error;
    }
    res.json(results.rows);
  });
});

// ../productos/buscarporcategoria/{nombre}/{categoria}
router.get('/buscarporcategoria/:nombre/:categoria', (req, res) => {
  const { nombre, categoria } = req.params;

  const query = `
    SELECT *
    FROM productos
    WHERE LOWER(SUBSTRING(nombre, 1, LENGTH($1))) = LOWER($1)
      AND categoria_id = $2
      AND activo = true
  `;

  pool.query(query, [nombre, categoria], (error, results) => {
    if (error) {
      throw error;
    }
    res.json(results.rows);
  });
});

//../productos/categoria/{id}
router.get('/categoria/:id', (req, res) => {
  const { id } = req.params;
  const idNumber = parseInt(id, 10);
  if (isNaN(idNumber) || idNumber < 0) {
    res.status(400).json({ mensaje: 'El ID debe ser un número mayor o igual a cero' });
    return;
  }
  const query = `
    SELECT *
    FROM productos
    WHERE categoria_id = $1
      AND activo = true
  `;

  pool.query(query, [id], (error, results) => {
    if (error) {
      throw error;
    }

    if (results.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'La categoría no tiene productos'
      });
    }

    res.json(results.rows);
  });
});

//../productos/{id}
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const idNumber = parseInt(id, 10);
  if (isNaN(idNumber) || idNumber < 0) {
    res.status(400).json({ mensaje: 'El ID debe ser un número mayor o igual a cero' });
    return;
  }
  const query = `
    SELECT *
    FROM productos
    WHERE id = $1
  `;

  pool.query(query, [id], (error, results) => {
    if (error) {
      throw error;
    }

    if (results.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Producto no encontrado'
      });
    }

    res.json(results.rows[0]);
  });
});

module.exports = router;
