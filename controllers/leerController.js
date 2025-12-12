const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs-extra');
const { BlockDecoder } = require('fabric-common');
const mysql = require('mysql2/promise');

const leerJson = async (req, res) => {
  try {
    const { tipo, txid } = req.params;

    if (!txid || !tipo) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos (tipo, txid)' });
    }

    const ccpPath = path.resolve(__dirname, '..', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(__dirname, '..', 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get('Admin@org1.example.com');
    if (!identity) {
      return res.status(500).json({ error: 'Identidad no encontrada en wallet' });
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'Admin@org1.example.com',
      discovery: { enabled: true, asLocalhost: true }
    });

    const channelName = tipo === 'light' ? 'lightchannel' : 'heavychannel';
    const network = await gateway.getNetwork(channelName);

    const contract = network.getContract('jsonstoragemodel');
    const qscc = network.getContract('qscc');

    // ✅ Llamada corregida con 2 parámetros
    const result = await contract.evaluateTransaction('GetDataByTxID', tipo, txid);
    const txData = JSON.parse(result.toString());

    // 🔎 Si es tipo light, recuperar contenido de base de datos
    let localData = null;
    if (tipo === 'light') {
      const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT, 10) || 3306
      });

      const [[row]] = await pool.query(
        'SELECT data FROM light_model_data WHERE tx_id = ?',
        [txid]
      );
      if (!row || !row.data) {
        return res.status(404).json({ error: 'No se pudo obtener contenido de la base de datos' });
      }
      localData = row.data;
    }

    // 🧱 Obtener bloque
    const blockBuf = await qscc.evaluateTransaction('GetBlockByTxID', channelName, txid);
    const block = BlockDecoder.decode(blockBuf);
    const envelope = block.data.data.find(d => d.payload.header.channel_header.tx_id === txid);
    if (!envelope) {
      throw new Error('No se encontró el envelope con el txid proporcionado');
    }

    const txHeader = envelope.payload.header.channel_header;
    const signature = envelope.signature;
    const creator = envelope.payload.header.signature_header.creator;

    await gateway.disconnect();

    res.json({
      payload: txData.payload, // hash (light) o JSON (heavy)
      tipo,
      channel: channelName,
      localData, // 🔄 nuevo campo: datos locales en caso light
      creator: {
        mspid: creator.mspid,
        id_bytes: creator.id_bytes.toString('utf8')
      },
      signature: signature.toString('base64'),
      tx_header: txHeader
    });

  } catch (error) {
    console.error('❌ Error al leer JSON:', error);
    res.status(500).json({
      error: 'Error interno al leer JSON',
      detalle: error.message || error.toString()
    });
  }
};

module.exports = { leerJson };
