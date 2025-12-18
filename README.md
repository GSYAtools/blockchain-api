# Blockchain API

![Node.js](https://img.shields.io/badge/Node.js-v14+-green)
![Hyperledger Fabric](https://img.shields.io/badge/Hyperledger%20Fabric-v2.2-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

## Tabla de Contenidos

- [Introducción](#introducción)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Requisitos Previos](#requisitos-previos)
- [Instalación y Configuración](#instalación-y-configuración)
- [Modelo de Datos](#modelo-de-datos)
- [Endpoints de la API](#endpoints-de-la-api)
- [Flujos de Operación Detallados](#flujos-de-operación-detallados)
- [Estructura de Base de Datos](#estructura-de-base-de-datos)
- [Chaincode (Smart Contract)](#chaincode-smart-contract)
- [Monitoreo y Métricas](#monitoreo-y-métricas)
- [Interfaz Web](#interfaz-web)
- [Troubleshooting](#troubleshooting)
- [Mejores Prácticas](#mejores-prácticas)

## Introducción

Este proyecto es una **API REST empresarial** desarrollada en Node.js con Express, diseñada para interactuar con una red de **Hyperledger Fabric (HLF)**. Su propósito principal es almacenar y recuperar datos JSON en la blockchain de HLF de manera eficiente, utilizando contratos inteligentes (chaincodes) para operaciones de escritura y lectura garantizando inmutabilidad y trazabilidad.

### Características Principales

**Doble Modelo de Almacenamiento**: Sistema híbrido que combina blockchain y base de datos relacional  
**Trazabilidad Completa**: Cada transacción es registrada con timestamps en nanosegundos  
**Monitoreo Avanzado**: Integración con Prometheus para métricas de rendimiento en tiempo real  
**Arquitectura Escalable**: Separación de cargas de trabajo mediante canales dedicados  
**Interfaz Web Integrada**: Dashboard para visualización y gestión de registros  
**Seguridad Blockchain**: Autenticación mediante identidades de wallet de Fabric  

### Modelos de Datos: Light vs Heavy

El proyecto implementa dos estrategias de almacenamiento optimizadas para diferentes casos de uso:

#### LIGHT (Modelo Ligero)
- **En Blockchain**: Solo almacena un hash SHA-256 del JSON (32 bytes)
- **En MySQL**: Almacena el JSON completo para consultas rápidas
- **Uso recomendado**: Datos que requieren consultas frecuentes pero inmutabilidad limitada
- **Ventaja**: Reduce la carga en el ledger de blockchain, mejora el rendimiento

#### HEAVY (Modelo Pesado)
- **En Blockchain**: Almacena el JSON completo de forma inmutable
- **En MySQL**: Solo almacena metadatos (sin el JSON)
- **Uso recomendado**: Datos críticos que requieren inmutabilidad total y auditabilidad
- **Ventaja**: Máxima trazabilidad y verificabilidad criptográfica

Ambos modelos utilizan canales separados en HLF (`lightchannel` y `heavychannel`) para optimizar el rendimiento y permitir una gestión independiente de políticas de endorsement.

## Arquitectura del Sistema

[![Arquitectura del Sistema](./docs/images/arquitectura-sistema.svg)](./docs/arquitectura-sistema.md)

> **[Ver diagrama interactivo completo](./docs/arquitectura-sistema.md)**

### Resumen de Arquitectura

La aplicación sigue una arquitectura de 3 capas con integración blockchain:

**1. Capa de Presentación**: Cliente (Web/API)  
**2. Capa de Lógica de Negocio**: API REST (Node.js + Express)  
**3. Capa de Datos**: Hyperledger Fabric + MySQL + Prometheus

### Flujo de Datos General

1. **Cliente → API**: Solicitud HTTP (POST/GET)
2. **API → Fabric**: Invocación de chaincode usando SDK de Fabric
3. **API → MySQL**: Persistencia de metadatos y datos (según modelo)
4. **API → Prometheus**: Consulta de métricas de rendimiento
5. **API → Cliente**: Respuesta JSON con resultado y metadatos

### Componentes Principales

| Componente | Tecnología | Función |
|-----------|-----------|---------|
| **Servidor API** | Node.js 14+ + Express 5.x | Manejo de peticiones HTTP y lógica de negocio |
| **Blockchain** | Hyperledger Fabric 2.2 | Almacenamiento inmutable de datos |
| **Base de Datos** | MySQL 8.0+ | Almacenamiento de metadatos y consultas rápidas |
| **Monitoreo** | Prometheus | Métricas de rendimiento y observabilidad |
| **Autenticación** | Fabric Wallet | Gestión de identidades y certificados |
| **Frontend** | HTML5/CSS3/JS Vanilla | Dashboard de visualización |

## Requisitos Previos

### Software Necesario

1. **Node.js** (v14 o superior)
   ```bash
   node --version  # Verificar versión
   ```

2. **MySQL Server** (v8.0 o superior)
   ```bash
   mysql --version
   ```

3. **Hyperledger Fabric Test Network** en ejecución
   - Fabric Samples clonado
   - Test network iniciado con canales `lightchannel` y `heavychannel`
   - Chaincode `jsonstoragemodel` deployado en ambos canales

4. **Prometheus** (opcional, para métricas)
   - Instalado y configurado para scraping de peers de Fabric

### Conocimientos Recomendados

- Fundamentos de blockchain y Hyperledger Fabric
- Node.js y desarrollo de APIs REST
- SQL y modelado de bases de datos
- Conceptos de observabilidad (opcional)

## Instalación y Configuración

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/GSYAtools/blockchain-api.git
cd blockchain-api
```

### Paso 2: Instalar Dependencias

```bash
npm install
```

### Paso 3: Configurar Variables de Entorno

Crea un archivo `.env` basado en `example.env`:

```bash
cp example.env .env
```

Edita el archivo `.env` con tus configuraciones:

```env
# --- API ---
PORT=3460

# --- MySQL ---
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=blockchain_user
DB_PASSWORD=tu_password_seguro
DB_NAME=blockchain_hlf

# --- Fabric Network ---
CCP_PATH=./connection-org1.json
WALLET_PATH=./wallet
IDENTITY=Admin@org1.example.com

# Canales
LIGHT_CHANNEL=lightchannel
HEAVY_CHANNEL=heavychannel

# Chaincodes
CHAINCODE_NAME=jsonstoragemodel

# Prometheus
PROMETHEUS_URL=http://localhost:9090
```

### Paso 4: Configurar la Base de Datos MySQL

```sql
CREATE DATABASE blockchain_hlf CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE blockchain_hlf;

-- Tabla para modelo LIGHT
CREATE TABLE light_model_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data JSON NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  start_tx_ns BIGINT UNSIGNED,
  end_tx_ns BIGINT UNSIGNED,
  tx_id VARCHAR(255) UNIQUE NOT NULL,
  INDEX idx_tx_id (tx_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla para modelo HEAVY
CREATE TABLE heavy_model_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tx_id VARCHAR(255) UNIQUE NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  start_tx_ns BIGINT UNSIGNED,
  end_tx_ns BIGINT UNSIGNED,
  INDEX idx_tx_id (tx_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Paso 5: Importar Identidades de Fabric

```bash
npm run import
```

Este comando ejecuta:
- `importConnection.js`: Copia el perfil de conexión desde Fabric test-network
- `importIdentity.js`: Importa la identidad de Admin a la wallet local

### Paso 6: Iniciar la API

```bash
npm start
```

La API estará disponible en `http://localhost:3460`

### Verificar Instalación

```bash
# Probar endpoint de registros
curl http://localhost:3460/registros

# Acceder a la interfaz web
# Abrir navegador en http://localhost:3460
```

## Modelo de Datos

[![Comparación de Modelos](./docs/images/modelo-datos-comparacion.svg)](./docs/modelo-datos.md)

> **[Ver comparación visual completa](./docs/modelo-datos.md)**

### Comparativa de Modelos

| Característica | Light Model | Heavy Model |
|---------------|-------------|-------------|
| **Dato en Blockchain** | Hash SHA-256 (32 bytes) | JSON completo |
| **Dato en MySQL** | JSON completo | Solo metadatos |
| **Tamaño en Ledger** | Fijo, mínimo | Variable, según JSON |
| **Velocidad de escritura** | Muy rápida | Más lenta |
| **Inmutabilidad del contenido** | Parcial (hash) | Total (JSON) |
| **Verificabilidad** | Hash verificable | Contenido completo verificable |
| **Costo de almacenamiento** | Bajo en blockchain | Alto en blockchain |
| **Casos de uso** | Logs, métricas, datos frecuentes | Contratos, documentos legales, auditoría |

### Estructura de Datos JSON

Ambos modelos aceptan cualquier estructura JSON válida. Ejemplo:

```json
{
  "usuario": "john_doe",
  "accion": "compra",
  "producto": {
    "id": "PROD-001",
    "nombre": "Laptop",
    "precio": 1200.50
  },
  "timestamp": "2025-12-17T10:30:00Z",
  "metadata": {
    "ip": "192.168.1.100",
    "dispositivo": "mobile"
  }
}
```

## Endpoints de la API

### 1. Guardar Datos en Blockchain

**Endpoint**: `POST /guardar-json`

**Descripción**: Guarda un objeto JSON en ambos modelos (light y heavy) simultáneamente.

**Request Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "data": {
    "campo1": "valor1",
    "campo2": "valor2",
    "anidado": {
      "subcampo": "valor"
    }
  },
  "descripcion": "Descripción opcional del registro"
}
```

**Parámetros**:
- `data` (objeto, requerido): Datos JSON a almacenar
- `descripcion` (string, requerido): Descripción del registro

**Response Success (200)**:
```json
{
  "message": "Guardado en light & heavy con nanosegundos en BD",
  "txidLight": "a1b2c3d4e5f6...",
  "txidHeavy": "f6e5d4c3b2a1..."
}
```

**Response Error (400)**:
```json
{
  "error": "Faltan campos requeridos (data, descripcion)"
}
```

**Response Error (500)**:
```json
{
  "error": "Mensaje de error detallado"
}
```

**Ejemplo con cURL**:
```bash
curl -X POST http://localhost:3460/guardar-json \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "nombre": "Juan",
      "edad": 30,
      "ciudad": "Madrid"
    },
    "descripcion": "Registro de usuario"
  }'
```

**Ejemplo con JavaScript (fetch)**:
```javascript
const response = await fetch('http://localhost:3460/guardar-json', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: { nombre: "Juan", edad: 30 },
    descripcion: "Registro de usuario"
  })
});

const result = await response.json();
console.log('TX IDs:', result.txidLight, result.txidHeavy);
```

---

### 2. Leer Datos por Transaction ID

**Endpoint**: `GET /leer-json/:tipo/:txid`

**Descripción**: Recupera un registro específico usando su transaction ID.

**Parámetros de URL**:
- `tipo` (string): `light` o `heavy`
- `txid` (string): Transaction ID retornado al guardar

**Response Success (200)**:
```json
{
  "payload": "hash_sha256..." ,  // Para light, o JSON completo para heavy
  "tipo": "light",
  "channel": "lightchannel",
  "localData": "{\"nombre\":\"Juan\",\"edad\":30}",  // Solo en light
  "creator": {
    "mspid": "Org1MSP",
    "id_bytes": "-----BEGIN CERTIFICATE-----\n..."
  },
  "signature": "base64_signature...",
  "tx_header": {
    "channel_id": "lightchannel",
    "tx_id": "a1b2c3d4e5f6...",
    "timestamp": {
      "seconds": 1702819800,
      "nanos": 123456789
    },
    "type": 3
  }
}
```

**Response Error (400)**:
```json
{
  "error": "Faltan parámetros requeridos (tipo, txid)"
}
```

**Response Error (404)**:
```json
{
  "error": "No se pudo obtener contenido de la base de datos"
}
```

**Ejemplo con cURL**:
```bash
curl http://localhost:3460/leer-json/light/a1b2c3d4e5f6...
```

**Ejemplo con JavaScript**:
```javascript
const txid = 'a1b2c3d4e5f6...';
const tipo = 'light';
const response = await fetch(`http://localhost:3460/leer-json/${tipo}/${txid}`);
const data = await response.json();

console.log('Datos:', JSON.parse(data.localData));
console.log('Creador:', data.creator.mspid);
```

---

### 3. Obtener Todos los Registros

**Endpoint**: `GET /registros`

**Descripción**: Obtiene todos los registros almacenados en MySQL (light y heavy).

**Response Success (200)**:
```json
{
  "light": [
    {
      "id": 1,
      "data": "{\"nombre\":\"Juan\",\"edad\":30}",
      "timestamp": "2025-12-17T10:30:00.000Z",
      "start_tx_ns": "1702819800000000000",
      "end_tx_ns": "1702819800123456789",
      "tx_id": "a1b2c3d4e5f6...",
      "tipo": "light"
    }
  ],
  "heavy": [
    {
      "id": 1,
      "timestamp": "2025-12-17T10:30:00.000Z",
      "start_tx_ns": "1702819800000000000",
      "end_tx_ns": "1702819800234567890",
      "tx_id": "f6e5d4c3b2a1...",
      "tipo": "heavy"
    }
  ]
}
```

**Ejemplo con cURL**:
```bash
curl http://localhost:3460/registros
```

---

### 4. Métricas de Transacción

**Endpoint**: `GET /metrics/tx/:txid`

**Descripción**: Obtiene métricas de rendimiento de Prometheus para una transacción específica.

**Parámetros de URL**:
- `txid` (string): Transaction ID

**Response Success (200)**:
```json
{
  "txid": "a1b2c3d4e5f6...",
  "timestamp": "2025-12-17T10:30:00.000Z",
  "duration_ms": 123.456,
  "metrics": {
    "blockLatency95": 450.5,
    "blocksPerSec": 2.3,
    "blockchainHeight": 1024,
    "systemCpuPct": 45.2,
    "hostMemUsagePct": 62.8,
    "peerCpuPct": 12.3,
    "peerMemBytes": 536870912
  }
}
```

**Response Error (404)**:
```json
{
  "error": "tx_id no encontrado"
}
```

**Ejemplo con cURL**:
```bash
curl http://localhost:3460/metrics/tx/a1b2c3d4e5f6...
```

---

### 5. Interfaz Web

**Endpoint**: `GET /`

**Descripción**: Interfaz web HTML para visualizar y gestionar registros.

Accede desde tu navegador: `http://localhost:3460`

---

### 6. Ruta de Datos Adicional

**Endpoint**: `/data/*`

**Descripción**: Ruta adicional para operaciones de datos (ver implementación en `routes/data.js`).

## Flujos de Operación Detallados

> **Diagramas interactivos disponibles**:
> - **[Flujo de Guardar Datos](./docs/flujo-guardar-datos.md)** - POST /guardar-json
> - **[Flujo de Leer Datos](./docs/flujo-leer-datos.md)** - GET /leer-json/:tipo/:txid
> - **[Diagramas de Secuencia](./docs/secuencia-completa.md)** - Interacciones completas

### Flujo 1: Guardar Datos (POST /guardar-json)

[![Flujo Guardar Datos](./docs/images/flujo-guardar-datos.svg)](./docs/flujo-guardar-datos.md)

**Resumen del proceso**:

1. **Validación**: Verifica campos requeridos (data, descripcion)
2. **Conexión**: Establece conexión con MySQL y Fabric
3. **Preparación**: Genera hash SHA-256 del JSON
4. **Transacción Light**: Submit a lightchannel con hash
5. **Transacción Heavy**: Submit a heavychannel con JSON completo
6. **Persistencia**: Guarda en ambas tablas de MySQL
7. **Respuesta**: Retorna txidLight y txidHeavy

**Tiempo estimado**: 200-500ms

**Ver diagrama de flujo completo**: [flujo-guardar-datos.md](./docs/flujo-guardar-datos.md)

---

### Flujo 2: Leer Datos (GET /leer-json/:tipo/:txid)

[![Flujo Leer Datos](./docs/images/flujo-leer-datos.svg)](./docs/flujo-leer-datos.md)

**Resumen del proceso**:

1. **Validación**: Verifica tipo (light/heavy) y txid
2. **Conexión**: Conecta a Fabric con la identidad
3. **Selección**: Elige canal según tipo (lightchannel/heavychannel)
4. **Query**: Ejecuta GetDataByTxID en chaincode
5. **MySQL** (solo light): Recupera JSON completo de base de datos
6. **Bloque**: Obtiene metadatos del bloque (creator, signature)
7. **Respuesta**: Retorna payload + metadatos

**Tiempo estimado**: 100-300ms

**Ver diagrama de flujo completo**: [flujo-leer-datos.md](./docs/flujo-leer-datos.md)

**Puntos clave**:
- Es una operación de **lectura** (evaluate), no modifica el ledger
- Para model light, se requiere consulta adicional a MySQL
- Retorna metadatos criptográficos del bloque (creator, signature)
- QSCC permite acceso de bajo nivel al bloque completo

## Estructura de Base de Datos

### Tabla: `light_model_data`

```sql
CREATE TABLE light_model_data (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  data           JSON NOT NULL,                  -- JSON completo
  timestamp      DATETIME DEFAULT CURRENT_TIMESTAMP,
  start_tx_ns    BIGINT UNSIGNED,               -- Inicio TX en nanosegundos
  end_tx_ns      BIGINT UNSIGNED,               -- Fin TX en nanosegundos
  tx_id          VARCHAR(255) UNIQUE NOT NULL,  -- Transaction ID de Fabric
  INDEX idx_tx_id (tx_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Campos**:
- `id`: Identificador autoincremental
- `data`: Objeto JSON completo (tipo MySQL JSON nativo)
- `timestamp`: Fecha y hora de la transacción
- `start_tx_ns`: Timestamp de inicio en nanosegundos (BigInt)
- `end_tx_ns`: Timestamp de fin en nanosegundos (BigInt)
- `tx_id`: Transaction ID único de Hyperledger Fabric

**Ejemplo de registro**:
```json
{
  "id": 1,
  "data": "{\"usuario\":\"john\",\"accion\":\"login\"}",
  "timestamp": "2025-12-17 10:30:00",
  "start_tx_ns": "1702819800000000000",
  "end_tx_ns": "1702819800123456789",
  "tx_id": "a1b2c3d4e5f6g7h8i9j0..."
}
```

---

### Tabla: `heavy_model_data`

```sql
CREATE TABLE heavy_model_data (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  tx_id          VARCHAR(255) UNIQUE NOT NULL,
  timestamp      DATETIME DEFAULT CURRENT_TIMESTAMP,
  start_tx_ns    BIGINT UNSIGNED,
  end_tx_ns      BIGINT UNSIGNED,
  INDEX idx_tx_id (tx_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Diferencias con `light_model_data`**:
- **NO** tiene columna `data` (el JSON está en blockchain)
- Solo almacena metadatos y referencias

**Ejemplo de registro**:
```json
{
  "id": 1,
  "tx_id": "f6e5d4c3b2a1...",
  "timestamp": "2025-12-17 10:30:00",
  "start_tx_ns": "1702819800000000000",
  "end_tx_ns": "1702819800234567890"
}
```

---

### Consultas Útiles

**Obtener duración de transacciones en microsegundos**:
```sql
SELECT 
  tx_id,
  timestamp,
  (end_tx_ns - start_tx_ns) / 1000 as duration_us
FROM light_model_data
ORDER BY duration_us DESC
LIMIT 10;
```

**Buscar registros por contenido JSON (light)**:
```sql
SELECT * FROM light_model_data
WHERE JSON_EXTRACT(data, '$.usuario') = 'john_doe';
```

**Análisis de rendimiento por hora**:
```sql
SELECT 
  DATE_FORMAT(timestamp, '%Y-%m-%d %H:00') as hour,
  COUNT(*) as total_transactions,
  AVG((end_tx_ns - start_tx_ns) / 1000000) as avg_duration_ms
FROM light_model_data
GROUP BY hour
ORDER BY hour DESC;
```

## Chaincode (Smart Contract)

### Nombre del Chaincode

`jsonstoragemodel` - Deployado en ambos canales

### Funciones Principales

#### 1. `StoreData(tipo, payload)`

**Descripción**: Almacena datos en el ledger.

**Parámetros**:
- `tipo` (string): "light" o "heavy"
- `payload` (string): Hash SHA-256 (light) o JSON completo (heavy)

**Operación**:
```go
// Pseudo-código
func StoreData(ctx, tipo string, payload string) error {
    key := ctx.GetTxID()
    value := {
        "tipo": tipo,
        "payload": payload,
        "timestamp": time.Now()
    }
    return ctx.PutState(key, value)
}
```

**Resultado**: Transaction ID único

---

#### 2. `GetDataByTxID(tipo, txid)`

**Descripción**: Recupera datos del ledger por Transaction ID.

**Parámetros**:
- `tipo` (string): "light" o "heavy"
- `txid` (string): Transaction ID

**Operación**:
```go
func GetDataByTxID(ctx, tipo string, txid string) (string, error) {
    value, err := ctx.GetState(txid)
    if err != nil {
        return "", err
    }
    return value, nil
}
```

**Resultado**: Objeto con tipo, payload y timestamp

---

### Políticas de Endorsement

**Recomendadas**:
- **Light Channel**: `OR('Org1MSP.member', 'Org2MSP.member')` - Más permisivo
- **Heavy Channel**: `AND('Org1MSP.member', 'Org2MSP.member')` - Más restrictivo

### Deployment

```bash
# Navegar a test-network
cd fabric-samples/test-network

# Crear canales
./network.sh createChannel -c lightchannel
./network.sh createChannel -c heavychannel

# Deploy chaincode en ambos canales
./network.sh deployCC -c lightchannel -ccn jsonstoragemodel -ccp ../chaincode/jsonstorage -ccl go
./network.sh deployCC -c heavychannel -ccn jsonstoragemodel -ccp ../chaincode/jsonstorage -ccl go
```

## Monitoreo y Métricas

### Integración con Prometheus

La API consulta Prometheus para obtener métricas de la red Fabric.

**Métricas Disponibles**:

| Métrica | Descripción | Query PromQL |
|---------|-------------|--------------|
| `blockLatency95` | Latencia de commit de bloques (p95) en μs | `histogram_quantile(0.95, peer_block_commit_duration_seconds_bucket)` |
| `blocksPerSec` | Bloques commiteados por segundo | `rate(peer_committed_block_total[1m])` |
| `blockchainHeight` | Altura actual del blockchain | `ledger_blockchain_height` |
| `systemCpuPct` | % de CPU del host | `100 - avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100` |
| `hostMemUsagePct` | % de memoria del host | `((MemTotal - MemAvailable) / MemTotal) * 100` |
| `peerCpuPct` | % de CPU del peer | `100 * rate(process_cpu_seconds_total{job="peer"}[1m])` |
| `peerMemBytes` | Memoria del peer en bytes | `process_resident_memory_bytes{job="peer"}` |

### Configuración de Prometheus

Archivo `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'peer0_org1'
    static_configs:
      - targets: ['peer0.org1.example.com:9443']
  
  - job_name: 'orderer'
    static_configs:
      - targets: ['orderer.example.com:8443']
  
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
```

### Dashboard de Métricas

Accede a `GET /metrics/tx/:txid` para visualizar:

```json
{
  "txid": "a1b2c3...",
  "timestamp": "2025-12-17T10:30:00Z",
  "duration_ms": 123.45,
  "metrics": {
    "blockLatency95": 450.5,
    "blocksPerSec": 2.3,
    "blockchainHeight": 1024,
    "systemCpuPct": 45.2,
    "hostMemUsagePct": 62.8,
    "peerCpuPct": 12.3,
    "peerMemBytes": 536870912
  }
}
```

## Interfaz Web

### Páginas Disponibles

#### 1. Dashboard Principal (`/`)

**Archivo**: `public/index.html`

**Funcionalidad**:
- Lista todos los registros (light y heavy)
- Muestra timestamp, tx_id y tipo
- Permite navegar a detalles de cada registro
- Auto-refresh cada 30 segundos

**Captura conceptual**:
```
┌─────────────────────────────────────────────┐
│          Blockchain API Dashboard           │
├─────────────────────────────────────────────┤
│                                             │
│  Filtrar: [tipo] [fecha]  [Refresh]         │
│                                             │
│  Registros LIGHT:                           │
│  ┌──────────────────────────────────────┐  │
│  │ ID: 1                                │  │
│  │ TX: a1b2c3d4...                      │  │
│  │ Timestamp: 2025-12-17 10:30:00       │  │
│  │ [Ver Detalles]                       │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Registros HEAVY:                           │
│  ┌──────────────────────────────────────┐  │
│  │ ID: 1                                │  │
│  │ TX: f6e5d4c3...                      │  │
│  │ Timestamp: 2025-12-17 10:30:01       │  │
│  │ [Ver Detalles]                       │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

#### 2. Visor de JSON (`/ver-json.html`)

**Archivo**: `public/ver-json.html`

**Funcionalidad**:
- Muestra detalles completos de un registro
- Pretty-print del JSON
- Información de blockchain (creator, signature)
- Metadatos de la transacción

**Parámetros URL**: `?tipo=light&txid=a1b2c3d4...`

---

### Estilos y Scripts

- **CSS**: `public/css/style.css`, `public/css/ver-json.css`
- **JavaScript**: `public/js/main.js`, `public/js/ver-json.js`

**Características**:
- Diseño responsive
- Syntax highlighting para JSON
- Manejo de errores con UI feedback
- Navegación SPA (Single Page App)

## Troubleshooting

### Problema: "Identidad no encontrada en wallet"

**Causa**: La wallet no tiene la identidad importada.

**Solución**:
```bash
npm run import
```

Verifica que existe: `wallet/Admin@org1.example.com.id`

---

### Problema: "Error al conectar con Fabric"

**Causas posibles**:
1. Test network no está corriendo
2. Puertos bloqueados
3. Perfil de conexión incorrecto

**Solución**:
```bash
# Verificar que test-network está activo
cd fabric-samples/test-network
./network.sh down
./network.sh up createChannel -c lightchannel
./network.sh up createChannel -c heavychannel

# Verificar conexión
docker ps | grep peer
```

---

### Problema: "MySQL connection refused"

**Causa**: MySQL no está corriendo o credenciales incorrectas.

**Solución**:
```bash
# Verificar MySQL
mysql -u root -p

# Probar conexión con credenciales del .env
mysql -h 127.0.0.1 -P 3306 -u blockchain_user -p blockchain_hlf
```

---

### Problema: "Chaincode not found"

**Causa**: Chaincode no está deployado en el canal.

**Solución**:
```bash
cd fabric-samples/test-network
./network.sh deployCC -c lightchannel -ccn jsonstoragemodel -ccp ../chaincode/jsonstorage -ccl go
./network.sh deployCC -c heavychannel -ccn jsonstoragemodel -ccp ../chaincode/jsonstorage -ccl go
```

---

### Problema: "Prometheus métricas vacías"

**Causa**: Prometheus no configurado o no está scrapeando.

**Solución**:
1. Verificar que Prometheus está corriendo: `http://localhost:9090`
2. Revisar targets: `http://localhost:9090/targets`
3. Verificar que peers exponen métricas:
   ```bash
   curl http://peer0.org1.example.com:9443/metrics
   ```

---

### Logs de Debugging

**Habilitar logs detallados**:
```bash
# En .env
NODE_ENV=development
DEBUG=fabric*

# Ejecutar
npm start
```

**Ver logs de Fabric**:
```bash
docker logs peer0.org1.example.com
docker logs orderer.example.com
```

## Mejores Prácticas

### Seguridad

1. **Nunca commitear el archivo `.env`**
   - Usa `.env.example` como plantilla
   - Añade `.env` a `.gitignore`

2. **Rotar identidades periódicamente**
   - Regenerar certificados de wallet
   - Usar HSM para producción

3. **Validar inputs**
   - Sanitizar datos JSON antes de guardar
   - Implementar rate limiting

4. **Usar HTTPS en producción**
   ```javascript
   const https = require('https');
   const fs = require('fs');
   
   const options = {
     key: fs.readFileSync('key.pem'),
     cert: fs.readFileSync('cert.pem')
   };
   
   https.createServer(options, app).listen(443);
   ```

---

### Performance

1. **Usar pool de conexiones MySQL**
   - Ya implementado en el código
   - Configurar `connectionLimit` según carga

2. **Cachear consultas frecuentes**
   ```javascript
   const NodeCache = require('node-cache');
   const cache = new NodeCache({ stdTTL: 60 });
   ```

3. **Paginar resultados en `/registros`**
   ```javascript
   app.get('/registros', async (req, res) => {
     const page = parseInt(req.query.page) || 1;
     const limit = 50;
     const offset = (page - 1) * limit;
     
     const [rows] = await pool.query(
       'SELECT * FROM light_model_data LIMIT ? OFFSET ?',
       [limit, offset]
     );
     // ...
   });
   ```

4. **Monitorizar métricas de la API**
   - Usar `express-prom-bundle` para exponer métricas propias

---

### Mantenimiento

1. **Backup regular de MySQL**
   ```bash
   mysqldump -u blockchain_user -p blockchain_hlf > backup_$(date +%Y%m%d).sql
   ```

2. **Snapshots de blockchain**
   - Usar Fabric Snapshot para reducir ledger size

3. **Limpiar registros antiguos**
   ```sql
   -- Archivar registros > 1 año
   DELETE FROM light_model_data 
   WHERE timestamp < DATE_SUB(NOW(), INTERVAL 1 YEAR);
   ```

4. **Monitorear tamaño de ledger**
   ```bash
   du -sh /var/hyperledger/production/ledgersData
   ```

---

### Escalabilidad

1. **Horizontal scaling de la API**
   - Usar load balancer (nginx, HAProxy)
   - PM2 para clustering en Node.js

2. **Separar canales por carga**
   - Crear canales adicionales según volumen
   - Distribu