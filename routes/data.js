const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const router = express.Router();

// MySQL connection pool
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     parseInt(process.env.DB_PORT, 10) || 3306,
  charset:  'utf8mb4'
});

// Ruta para devolver datos JSON desde la base de datos
router.get('/:txid', async (req, res) => {
  const { txid } = req.params;

  try {
    const [[row]] = await pool.query(
      `SELECT data FROM light_model_data WHERE tx_id = ? LIMIT 1`,
      [txid]
    );

    if (!row) {
      return res.status(404).json({ error: 'Datos no encontrados en base de datos' });
    }

    res.json({ data: row.data });
  } catch (err) {
    console.error('Error consultando base de datos:', err);
    res.status(500).json({ error: 'Error interno al consultar la base de datos' });
  }
});

module.exports = router;
