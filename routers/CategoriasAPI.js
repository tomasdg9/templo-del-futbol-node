const express = require('express');
const pool = require('../db'); // Ruta relativa al archivo db.js

const router = express.Router();

// ../categorias/
router.get('/', (req, res) => {
    pool.query('SELECT * FROM categorias WHERE visible = true', (error, results) => {
      if (error) {
        throw error;
      }
      res.json(results.rows);
    });
  });
  
// ../categorias/{id}
router.get('/:id', (req, res) => {
    const { id } = req.params;
    pool.query('SELECT * FROM categorias WHERE id = $1', [id], (error, results) => {
      if (error) {
        throw error;
      }
      const categorias = result.rows;
      if(categorias.length == 0){
        res.status(404).json({
          mensaje: 'Categoria no encontrada'
        });
      } else 
        res.json(results.rows);
    });
  });

// ../categorias/buscar/{name} -- OBS: Se rompe si se pasa name vacio, preguntar en la práctica.
router.get('/buscar/:name', (req, res) => {
  const { name } = req.params;
    pool.query('SELECT * FROM categorias WHERE LOWER(nombre) = LOWER($1)', [name], (error, results) => {
      if (error) {
        throw error;
      }
      const categorias = result.rows;
      if(categorias.length == 0){
        res.status(404).json({
          mensaje: 'Categoria no encontrada'
        });
      } else 
        res.json(results.rows);
    });
});
  
// ../categorias/page/{page}
router.get('/page/:page', (req, res) => {
  const { page } = req.params;
  const pageAux = page - 1;
  const limit = 6;
  const offset = limit * pageAux;
  pool.query('SELECT * FROM categorias ORDER BY id ASC OFFSET $1 LIMIT $2', [offset, limit])
    .then((result) => {
      const categorias = result.rows;
      if (categorias.length === 0) {
        res.status(404).json({
          mensaje: 'Página de categorías no encontrada'
        });
      } else {
        res.json(categorias);
      }
    })
    .catch((error) => {
      throw error;
    });
});
  
module.exports = router;
