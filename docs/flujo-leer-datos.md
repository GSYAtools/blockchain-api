# Flujo de Leer Datos - GET /leer-json/:tipo/:txid

Este diagrama muestra el flujo completo de operaciones cuando se leen datos de la blockchain.

```mermaid
flowchart TD
    Start([Cliente envía GET<br/>/leer-json/tipo/txid]) --> ValidateParams{Validar<br/>Parámetros}
    
    ValidateParams -->|Error| Error400[❌ Error 400<br/>Faltan parámetros]
    ValidateParams -->|OK| ConnectFabric[Conectar a Fabric<br/>- Cargar perfil conexión<br/>- Autenticar wallet<br/>- Conectar gateway]
    
    ConnectFabric --> SelectChannel{Seleccionar<br/>Canal}
    
    SelectChannel -->|light| LightChannel[Canal: lightchannel]
    SelectChannel -->|heavy| HeavyChannel[Canal: heavychannel]
    
    LightChannel --> QueryCC[Consultar Chaincode<br/>evaluateTransaction<br/>GetDataByTxID]
    HeavyChannel --> QueryCC
    
    QueryCC --> CheckType{Tipo = light?}
    
    CheckType -->|Sí| QueryMySQL[Consultar MySQL<br/>SELECT data<br/>FROM light_model_data<br/>WHERE tx_id = ?]
    CheckType -->|No| GetBlock
    
    QueryMySQL -->|No encontrado| Error404[❌ Error 404<br/>Datos no encontrados]
    QueryMySQL -->|Encontrado| GetJSON[Obtener JSON completo]
    
    GetJSON --> GetBlock[Obtener Detalles Bloque<br/>QSCC GetBlockByTxID]
    
    GetBlock --> DecodeBlock[Decodificar Bloque<br/>- Creator MSP ID + cert<br/>- Signature<br/>- Transaction Header]
    
    DecodeBlock --> BuildResponse[Construir Respuesta<br/>- payload<br/>- tipo<br/>- channel<br/>- localData light<br/>- creator<br/>- signature<br/>- tx_header]
    
    BuildResponse --> Disconnect[Desconectar Gateway]
    
    Disconnect --> Response[✅ Respuesta 200 OK<br/>JSON con todos los datos]
    
    ConnectFabric -->|Error| Error500[❌ Error 500<br/>Error conexión Fabric]
    QueryCC -->|Error| ErrorCC[❌ Error 500<br/>Chaincode error]
    GetBlock -->|Error| ErrorBlock[❌ Error 500<br/>Error obtener bloque]
    
    Error400 --> End([Fin])
    Error404 --> End
    Error500 --> End
    ErrorCC --> End
    ErrorBlock --> End
    Response --> End
    
    style Start fill:#90EE90
    style End fill:#FFB6C1
    style Response fill:#87CEEB
    style Error400 fill:#FF6B6B
    style Error404 fill:#FFA500
    style Error500 fill:#FF6B6B
    style ErrorCC fill:#FF6B6B
    style ErrorBlock fill:#FF6B6B
    style LightChannel fill:#FFD700
    style HeavyChannel fill:#FFA500
    style QueryMySQL fill:#DDA0DD
```

## Puntos Clave

- **Tiempo estimado**: 100-300ms
- Es una operación de **lectura** (evaluate), no modifica el ledger
- Para model light, se requiere consulta adicional a MySQL
- Retorna metadatos criptográficos del bloque (creator, signature)
- QSCC permite acceso de bajo nivel al bloque completo

## Respuesta Ejemplo

```json
{
  "payload": "hash_sha256_o_json_completo",
  "tipo": "light",
  "channel": "lightchannel",
  "localData": "{\"usuario\":\"john\",\"edad\":30}",
  "creator": {
    "mspid": "Org1MSP",
    "id_bytes": "-----BEGIN CERTIFICATE-----..."
  },
  "signature": "base64_signature...",
  "tx_header": {
    "channel_id": "lightchannel",
    "tx_id": "a1b2c3d4e5f6...",
    "timestamp": {...}
  }
}
```
