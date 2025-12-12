require('dotenv').config();
const { Gateway, Wallets } = require('fabric-network');
const crypto = require('crypto');
const mysql  = require('mysql2/promise');
const fs     = require('fs-extra');
const path   = require('path');

const guardarJson = async (req, res) => {
  let db, gateway;
  try {
    const { data, descripcion } = req.body;
    if (!data || !descripcion) {
      return res
        .status(400)
        .json({ error: 'Faltan campos requeridos (data, descripcion)' });
    }

    // 1) Conectar MySQL
    db = await mysql.createConnection({
      host:     process.env.DB_HOST,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port:     parseInt(process.env.DB_PORT, 10) || 3306,
      charset:  'utf8mb4'
    });

    // 2) Cargar perfil y wallet
    const ccpPath = path.resolve(__dirname, '..', process.env.CCP_PATH);
    const ccp     = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const wallet  = await Wallets.newFileSystemWallet(
      path.resolve(__dirname, '..', process.env.WALLET_PATH)
    );
    const identity = await wallet.get(process.env.IDENTITY);
    if (!identity) {
      return res
        .status(500)
        .json({ error: 'Identidad no encontrada en wallet' });
    }

    // 3) Conectar Fabric Gateway
    gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: process.env.IDENTITY,
      discovery: { enabled: true, asLocalhost: true }
    });

    // 4) Preparar payloads
    const jsonString = JSON.stringify(data);
    const lightHash  = crypto.createHash('sha256')
                             .update(jsonString)
                             .digest('hex');
    const { LIGHT_CHANNEL, HEAVY_CHANNEL, CHAINCODE_NAME } = process.env;

    // 5) Transacción LIGHT (ns)
    const netL     = await gateway.getNetwork(LIGHT_CHANNEL);
    const contL    = netL.getContract(CHAINCODE_NAME);
    const txL      = contL.createTransaction('StoreData');
    const startLns = process.hrtime.bigint();
    await txL.submit('light', lightHash);
    const endLns   = process.hrtime.bigint();
    const txidL    = txL.getTransactionId();

    // 6) Transacción HEAVY (ns)
    const netH     = await gateway.getNetwork(HEAVY_CHANNEL);
    const contH    = netH.getContract(CHAINCODE_NAME);
    const txH      = contH.createTransaction('StoreData');
    const startHns = process.hrtime.bigint();
    await txH.submit('heavy', jsonString);
    const endHns   = process.hrtime.bigint();
    const txidH    = txH.getTransactionId();

    // 7) Persistir en BD
    const now = new Date();
    await db.execute(
      `INSERT INTO light_model_data
         (data, timestamp, start_tx_ns, end_tx_ns, tx_id)
       VALUES (?, ?, ?, ?, ?)`,
      [ jsonString, now, startLns.toString(), endLns.toString(), txidL ]
    );
    await db.execute(
      `INSERT INTO heavy_model_data
         (tx_id, timestamp, start_tx_ns, end_tx_ns)
       VALUES (?, ?, ?, ?)`,
      [ txidH, now, startHns.toString(), endHns.toString() ]
    );

    // 8) Desconectar y responder
    await gateway.disconnect();
    await db.end();
    res.json({
      message: 'Guardado en light & heavy con nanosegundos en BD',
      txidLight: txidL,
      txidHeavy: txidH
    });

  } catch (err) {
    console.error('❌ Error completo:', err);
    if (gateway) await gateway.disconnect();
    if (db)      await db.end();
    res.status(500).json({ error: err.message });
  }
};

module.exports = { guardarJson };
