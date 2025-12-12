# Blockchain API

## Introducción del proyecto

Este proyecto es una API REST desarrollada en Node.js con Express, diseñada para interactuar con una red de Hyperledger Fabric (HLF). Su propósito principal es almacenar y recuperar datos JSON en la blockchain de HLF, utilizando contratos inteligentes (chaincodes) para operaciones de escritura y lectura. Además, integra una base de datos MySQL para persistir metadatos de las transacciones (como IDs de transacción, timestamps y tiempos de ejecución), y consulta métricas desde Prometheus para monitoreo. Incluye una interfaz web simple para visualizar los registros almacenados.

El proyecto se enfoca en dos modelos de datos: "light" (datos ligeros) y "heavy" (datos pesados), distribuidos en canales separados de HLF (`lightchannel` y `heavychannel`). Esto permite una separación lógica de cargas de trabajo en la red blockchain.

## ¿Cómo funciona?

#### Arquitectura general
- **Cliente**: Un usuario externo (como una aplicación web o API client) envía solicitudes HTTP a la API.
- **API REST (Node.js + Express)**: Maneja las solicitudes, valida datos, interactúa con HLF y MySQL, y devuelve respuestas.
- **Hyperledger Fabric**: La red blockchain donde se almacenan los datos JSON de forma inmutable. Usa identidades de wallet para autenticación.
- **Persistencia adicional**: MySQL almacena metadatos de transacciones para consultas rápidas y análisis.
- **Monitoreo**: Prometheus proporciona métricas de rendimiento (e.g., tiempos de transacción).
- **Interfaz web**: Archivos estáticos en public sirven una dashboard simple para ver registros.

El flujo típico es: Cliente → API → HLF (para blockchain) + MySQL (para metadatos) → Respuesta al cliente.

### Componentes clave y flujo de funcionamiento
1. **Configuración inicial**:
   - **Archivos de configuración**: .env define variables como puerto (8090), credenciales de MySQL, rutas a wallet y perfil de conexión (connection-org1.json), canales y chaincode (`jsonstoragemodel`).
   - **Importación de identidades**: importIdentity.js importa la identidad de admin (`Admin@org1.example.com`) desde el directorio de test-network de Fabric Samples a la wallet local (wallet). importConnection.js copia el perfil de conexión.
   - **Dependencias**: Usa `fabric-network` SDK para interactuar con HLF, `mysql2` para la DB, `express` para el servidor, y `dotenv` para variables de entorno.

2. **Servidor principal (app.js)**:
   - Inicia el servidor Express en el puerto definido (8090 por defecto).
   - Configura middleware: `body-parser` para JSON, rutas estáticas para public.
   - Define rutas principales:
     - `/guardar-json`: Para guardar datos JSON en HLF.
     - `/leer-json/:txid`: Para leer datos por ID de transacción.
     - `/metrics`: Para consultar métricas de Prometheus.
     - `/data`: Ruta adicional (posiblemente para datos generales).
     - `/registros`: Endpoint para obtener todos los registros de MySQL (light y heavy).
   - Crea un pool de conexiones MySQL para consultas eficientes.

3. **Rutas y controladores**:
   - **Rutas (routes)**: Definen endpoints y delegan lógica a controladores.
     - `guardar.js`: Maneja POST para guardar JSON. Llama al controlador correspondiente.
     - `leer.js`: Maneja GET para leer JSON por txid.
     - `metrics.js`: Consulta métricas de Prometheus (e.g., tiempos de transacción).
     - `data.js`: Posiblemente para operaciones de datos adicionales.
   - **Controladores (controllers)**: Contienen la lógica de negocio.
     - `guardarController.js`: Conecta a HLF, invoca el chaincode para guardar JSON en el canal apropiado (light o heavy), mide tiempos, y guarda metadatos en MySQL.
     - `leerController.js`: Conecta a HLF, consulta el chaincode para recuperar JSON por txid.

4. **Interacción con Hyperledger Fabric**:
   - Usa el SDK `fabric-network` para conectarse a la red via connection-org1.json.
   - Autentica con la identidad de la wallet (`Admin@org1.example.com`).
   - Invoca chaincodes en canales específicos: `lightchannel` para datos light, `heavychannel` para heavy.
   - Operaciones: Submit (escribir) y evaluate (leer) transacciones en el ledger.

5. **Persistencia en MySQL**:
   - Tablas: `light_model_data` (con columna `data` para JSON) y `heavy_model_data` (sin `data`, solo metadatos).
   - Al guardar, inserta: ID, datos JSON (si light), timestamp, tiempos de transacción (start/end en nanosegundos), tx_id.
   - Endpoint `/registros` consulta ambas tablas y devuelve JSON con tipo ('light' o 'heavy').

6. **Interfaz web (public)**:
   - `index.html`: Dashboard principal para ver registros.
   - `ver-json.html`: Página para visualizar JSON específico.
   - CSS/JS: Estilos y scripts para interactuar con la API (e.g., fetch a `/registros`).

7. **Monitoreo y métricas**:
   - Ruta `/metrics` consulta Prometheus en `http://localhost:9090` para métricas relacionadas con transacciones.

### Inicio y ejecución
- **Scripts en package.json**: `npm start` ejecuta `node app.js`. `npm run import` importa identidad y conexión.
- **Requisitos**: Red HLF corriendo (e.g., test-network), MySQL configurado, Prometheus para métricas.
- **Flujo de ejemplo**:
  1. POST a `/guardar-json` con JSON → API valida, conecta a HLF, guarda en chaincode, inserta en MySQL → Devuelve txid.
  2. GET a `/leer-json/:txid` → API consulta HLF → Devuelve JSON.
  3. Usuario visita `/` → Dashboard carga registros de `/registros`.

Este proyecto facilita el uso de HLF para almacenamiento de datos JSON, con persistencia adicional para eficiencia y una UI básica para gestión. Si necesitas detalles sobre un archivo específico o modificaciones, dime.