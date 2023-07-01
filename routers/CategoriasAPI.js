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
    
    // Validar que id sea un entero mayor o igual que cero
    if (!Number.isInteger(Number(id)) || Number(id) < 0) {
        res.status(400).json({
            mensaje: 'El ID debe ser un entero mayor o igual que cero'
        });
        return;
    }

    pool.query('SELECT * FROM categorias WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error;
        }
        const categorias = results.rows;
        if (categorias.length === 0) {
            res.status(404).json({
                mensaje: 'Categoría no encontrada'
            });
        } else {
            res.json(categorias);
        }
    });
});

// ../categorias/buscar/{name}
router.get('/buscar/:name', (req, res) => {
    const { name } = req.params;
    
    // Validar que name no sea vacío
    if (!name || name.trim() === '') {
        res.status(400).json({
            mensaje: 'El nombre no puede estar vacío'
        });
        return;
    }

    pool.query('SELECT * FROM categorias WHERE LOWER(nombre) = LOWER($1)', [name], (error, results) => {
        if (error) {
            throw error;
        }
        const categorias = results.rows;
        if (categorias.length === 0) {
            res.status(404).json({
                mensaje: 'Categoría no encontrada'
            });
        } else {
            res.json(categorias);
        }
    });
});

  
// ../categorias/page/{page}
router.get('/page/:page', (req, res) => {
  const { page } = req.params;

  // Validar que page sea un entero mayor o igual a 1
  const pageNumber = parseInt(page, 10);
  if (isNaN(pageNumber) || pageNumber < 1) {
    res.status(400).json({
      mensaje: 'La página debe ser un entero mayor o igual a 1'
    });
    return;
  }

  const pageAux = pageNumber - 1;
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
