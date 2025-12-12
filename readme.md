# CONTRUCCIÓN DE LA API

## 🧰 PASO 1: Crear y configurar el proyecto

```bash
# 1. Crear el proyecto
mkdir fabric-api
cd fabric-api
npm init -y

# 2. Instalar dependencias
npm install express fabric-network body-parser uuid fs-extra

# 3. Crear estructura básica
mkdir controllers routes wallet
touch app.js
```

---

## 📝 PASO 2: Código de la API

### 🔌 `app.js` – Punto de entrada

```js
const express = require('express');
const bodyParser = require('body-parser');
const guardarRouter = require('./routes/guardar');
const leerRouter = require('./routes/leer');

const app = express();
const PORT = process.env.PORT || 42300;

app.use(bodyParser.json());
app.use('/guardar-json', guardarRouter);
app.use('/leer-json', leerRouter);

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
```

---

### 📂 `routes/guardar.js`

```js
const express = require('express');
const router = express.Router();
const { guardarJson } = require('../controllers/guardarController');

router.post('/', guardarJson);

module.exports = router;
```

---

### 📂 `routes/leer.js`

```js
const express = require('express');
const router = express.Router();
const { leerJson } = require('../controllers/leerController');

router.get('/:txid', leerJson);

module.exports = router;
```

---

### 🔧 `controllers/guardarController.js`

```js
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs-extra');

const guardarJson = async (req, res) => {
  try {
    const { data, descripcion } = req.body;
    if (!data || !descripcion) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // 1. Cargar conexión
    const ccpPath = path.resolve(__dirname, '..', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // 2. Cargar wallet
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

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('jsonstore');

    const jsonString = JSON.stringify(data);
    const tx = contract.createTransaction('StoreData');
    await tx.submit(jsonString);

    const txid = tx.getTransactionId();

    // Registrar metadata en archivo local
    const logPath = path.join(__dirname, '..', 'tx-registros.json');
    let registros = [];

    if (fs.existsSync(logPath)) {
      registros = JSON.parse(fs.readFileSync(logPath));
    }

    registros.push({
      txid,
      descripcion,
      timestamp: new Date().toISOString()
    });

    fs.writeFileSync(logPath, JSON.stringify(registros, null, 2));

    await gateway.disconnect();

    res.json({ message: 'JSON guardado en Fabric', txid });
  } catch (error) {
    console.error('Error al guardar JSON:', error);
    res.status(500).json({ error: 'Error interno al guardar JSON' });
  }
};

module.exports = { guardarJson };
```

---

### 🔧 `controllers/leerController.js`

```js
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs-extra');

const leerJson = async (req, res) => {
  try {
    const { txid } = req.params;

    if (!txid) {
      return res.status(400).json({ error: 'Falta el txid en la URL' });
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

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('jsonstore');

    const result = await contract.evaluateTransaction('GetDataByTxID', txid);
    const jsonData = JSON.parse(result.toString());

    await gateway.disconnect();

    res.json(jsonData);
  } catch (error) {
    console.error('Error al leer JSON:', error);
    res.status(500).json({ error: 'Error interno al leer JSON' });
  }
};

module.exports = { leerJson };
```

---

## 🛠️ PASO 3: Ejecutar la API

### 📌 Asegúrate de que:

* La red `test-network` esté corriendo:

  ```bash
  cd fabric-samples/test-network
  ./network.sh up createChannel -c mychannel -ca
  ./network.sh deployCC -ccn jsonstore -ccp ../chaincode/jsonstore/go -ccl go
  ```

* La identidad `Admin@org1.example.com` fue importada a una wallet en `fabric-api/wallet/` usando algo como:

  ```bash
  node ./path/to/fabric-samples/test-network/addToWallet.js
  ```

  O copia manualmente la wallet desde `fabric-samples/test-network/wallet` a tu carpeta `fabric-api/wallet`.

* Copia también `connection-org1.json` desde `fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json`.

---

## 📁 Crear el script

Guárdalo como `importAdmin.js` en la raíz del proyecto (`fabric-api/`):

```js
const fs = require('fs');
const path = require('path');
const { Wallets, X509Identity } = require('fabric-network');

async function main() {
  try {
    // Ruta a los certificados de Admin generados por la test-network
    const credPath = path.join(
      __dirname,
      '..',
      'fabric-samples',
      'test-network',
      'organizations',
      'peerOrganizations',
      'org1.example.com',
      'users',
      'Admin@org1.example.com',
      'msp'
    );

    const cert = fs.readFileSync(path.join(credPath, 'signcerts', 'cert.pem')).toString();
    const key = fs.readFileSync(path.join(credPath, 'keystore', fs.readdirSync(path.join(credPath, 'keystore'))[0])).toString();

    const identityLabel = 'Admin@org1.example.com';
    const mspId = 'Org1MSP';

    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = {
      credentials: {
        certificate: cert,
        privateKey: key,
      },
      mspId,
      type: 'X.509',
    };

    await wallet.put(identityLabel, identity);
    console.log(`✅ Identidad '${identityLabel}' importada correctamente a la wallet.`);
  } catch (error) {
    console.error(`❌ Error importando identidad: ${error}`);
    process.exit(1);
  }
}

main();
```

---

## ▶️ Ejecutar el script

Asegúrate de que la red de Fabric esté creada con el `CA` y el `Admin` generado. Luego ejecuta:

```bash
node importAdmin.js
```

Si todo va bien, verás:

```
✅ Identidad 'Admin@org1.example.com' importada correctamente a la wallet.
```

---

## 🚀 Ejecutar

```bash
node app.js
```

La API se servirá en:

```
POST http://localhost:42300/guardar-json
GET  http://localhost:42300/leer-json/:txid
```

---

## 📤 1. Enviar JSON con `POST /guardar-json`

```bash
curl -X POST http://localhost:42300/guardar-json \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "nombre": "Juan Pérez",
      "edad": 30,
      "email": "juan@example.com"
    },
    "descripcion": "Registro de usuario Juan Pérez"
  }'
```

📌 Esto debe devolverte algo como:

```json
{
  "message": "JSON guardado en Fabric",
  "txid": "abcdef123456..."
}
```

Guarda ese `txid`.

---

## 📥 2. Leer JSON con `GET /leer-json/:txid`

Reemplaza `<TXID_AQUI>` por el valor real:

```bash
curl http://localhost:42300/leer-json/<TXID_AQUI>
```

Ejemplo:

```bash
curl http://localhost:42300/leer-json/abcdef1234567890
```

Y deberías ver algo como:

```json
{
  "nombre": "Juan Pérez",
  "edad": 30,
  "email": "juan@example.com"
}
```
