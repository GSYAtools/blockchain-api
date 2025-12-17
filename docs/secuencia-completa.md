# Diagrama de Secuencia - Operación Completa

Diagrama de secuencia mostrando la interacción entre todos los componentes del sistema.

```mermaid
sequenceDiagram
    actor Cliente
    participant API as API REST
    participant Fabric as Hyperledger Fabric
    participant MySQL as MySQL DB
    participant Prom as Prometheus
    
    Note over Cliente,Prom: Operación: Guardar Datos
    
    Cliente->>+API: POST /guardar-json<br/>{data, descripcion}
    
    API->>API: Validar datos
    
    API->>+MySQL: Conectar
    MySQL-->>-API: Conexión OK
    
    API->>API: Cargar wallet<br/>Admin@org1.example.com
    
    API->>+Fabric: Connect Gateway
    Fabric-->>-API: Gateway OK
    
    API->>API: Generar hash SHA-256
    
    rect rgb(255, 248, 220)
        Note over API,Fabric: Transacción LIGHT
        API->>+Fabric: Submit to lightchannel<br/>StoreData('light', hash)
        Fabric->>Fabric: Validar transacción
        Fabric->>Fabric: Endorsement
        Fabric->>Fabric: Commit a ledger
        Fabric-->>-API: txidLight
    end
    
    rect rgb(255, 228, 225)
        Note over API,Fabric: Transacción HEAVY
        API->>+Fabric: Submit to heavychannel<br/>StoreData('heavy', JSON)
        Fabric->>Fabric: Validar transacción
        Fabric->>Fabric: Endorsement
        Fabric->>Fabric: Commit a ledger
        Fabric-->>-API: txidHeavy
    end
    
    API->>+MySQL: INSERT light_model_data<br/>(JSON, timestamp, txid)
    MySQL-->>-API: Insert OK
    
    API->>+MySQL: INSERT heavy_model_data<br/>(timestamp, txid)
    MySQL-->>-API: Insert OK
    
    API->>Fabric: Disconnect
    API->>MySQL: Close connection
    
    API-->>-Cliente: 200 OK<br/>{txidLight, txidHeavy}
    
    Note over Cliente,Prom: Operación: Leer Datos
    
    Cliente->>+API: GET /leer-json/light/txid
    
    API->>API: Validar parámetros
    
    API->>+Fabric: Connect Gateway
    Fabric-->>-API: Gateway OK
    
    API->>+Fabric: Evaluate lightchannel<br/>GetDataByTxID('light', txid)
    Fabric->>Fabric: Query ledger
    Fabric-->>-API: {tipo, payload: hash}
    
    API->>+MySQL: SELECT data<br/>FROM light_model_data<br/>WHERE tx_id = ?
    MySQL-->>-API: JSON completo
    
    API->>+Fabric: QSCC GetBlockByTxID
    Fabric->>Fabric: Obtener bloque
    Fabric-->>-API: Block details<br/>(creator, signature, header)
    
    API->>Fabric: Disconnect
    
    API-->>-Cliente: 200 OK<br/>{payload, localData,<br/>creator, signature}
    
    Note over Cliente,Prom: Operación: Consultar Métricas
    
    Cliente->>+API: GET /metrics/tx/txid
    
    API->>+MySQL: SELECT timestamp, start_tx_ns, end_tx_ns<br/>WHERE tx_id = ?
    MySQL-->>-API: Metadata
    
    API->>API: Calcular timerange
    
    loop Para cada métrica
        API->>+Prom: Query PromQL<br/>(blockLatency, CPU, Memory...)
        Prom->>Prom: Ejecutar query
        Prom-->>-API: Resultado métrica
    end
    
    API-->>-Cliente: 200 OK<br/>{txid, metrics: {...}}
```

## Flujo de Datos por Componente

```mermaid
graph TD
    subgraph Fase1["📥 Fase 1: Recepción"]
        C1[Cliente envía datos] --> V1[API valida estructura]
        V1 --> P1[Prepara transacciones]
    end
    
    subgraph Fase2["⛓️ Fase 2: Blockchain"]
        P1 --> B1[Transacción Light<br/>hash a lightchannel]
        P1 --> B2[Transacción Heavy<br/>JSON a heavychannel]
        B1 --> E1[Endorsement]
        B2 --> E2[Endorsement]
        E1 --> L1[Commit al Ledger]
        E2 --> L2[Commit al Ledger]
    end
    
    subgraph Fase3["💾 Fase 3: Persistencia"]
        L1 --> D1[Guardar en light_model_data]
        L2 --> D2[Guardar en heavy_model_data]
        D1 --> M1[Metadatos + JSON]
        D2 --> M2[Solo metadatos]
    end
    
    subgraph Fase4["✅ Fase 4: Respuesta"]
        M1 --> R1[Generar respuesta]
        M2 --> R1
        R1 --> R2[Enviar txIDs al cliente]
    end
    
    style Fase1 fill:#e1f5ff
    style Fase2 fill:#f0e1ff
    style Fase3 fill:#e1ffe1
    style Fase4 fill:#ffe1e1
    style B1 fill:#FFD700
    style B2 fill:#FFA500
    style D1 fill:#87CEEB
    style D2 fill:#DDA0DD
```

## Tiempos de Respuesta

```mermaid
gantt
    title Tiempos de Ejecución por Operación
    dateFormat X
    axisFormat %L ms
    
    section Guardar Datos
    Validación           :0, 5
    Conectar MySQL       :5, 15
    Cargar Wallet        :15, 25
    TX Light (blockchain):25, 175
    TX Heavy (blockchain):175, 350
    Persistir MySQL      :350, 380
    Desconectar          :380, 390
    Responder            :390, 400
    
    section Leer Datos
    Validación           :0, 5
    Conectar Fabric      :5, 25
    Query Chaincode      :25, 85
    Query MySQL (Light)  :85, 105
    Obtener Bloque       :105, 185
    Construir Respuesta  :185, 195
    Responder            :195, 200
    
    section Métricas
    Query MySQL          :0, 20
    Query Prometheus x7  :20, 180
    Procesar Respuesta   :180, 190
    Responder            :190, 200
```

## Interacciones Críticas

### 1. Autenticación y Seguridad
```mermaid
sequenceDiagram
    participant API
    participant Wallet
    participant Fabric
    
    API->>Wallet: Solicitar identidad<br/>Admin@org1.example.com
    Wallet->>Wallet: Verificar certificado
    Wallet-->>API: Certificado X.509
    API->>Fabric: Connect con certificado
    Fabric->>Fabric: Validar certificado<br/>contra CA
    Fabric-->>API: Conexión autenticada
```

### 2. Endorsement y Consenso
```mermaid
sequenceDiagram
    participant API
    participant Peer1
    participant Peer2
    participant Orderer
    
    API->>Peer1: Proposal Transaction
    API->>Peer2: Proposal Transaction
    Peer1->>Peer1: Simulate & Endorse
    Peer2->>Peer2: Simulate & Endorse
    Peer1-->>API: Endorsement 1
    Peer2-->>API: Endorsement 2
    API->>Orderer: Submit endorsed TX
    Orderer->>Orderer: Order & Create Block
    Orderer-->>Peer1: Distribute Block
    Orderer-->>Peer2: Distribute Block
    Peer1->>Peer1: Validate & Commit
    Peer2->>Peer2: Validate & Commit
```
