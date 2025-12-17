# Arquitectura del Sistema - Blockchain API

Este diagrama muestra la arquitectura completa del sistema y cómo interactúan los diferentes componentes.

```mermaid
graph TB
    subgraph Cliente["🌐 CLIENTE"]
        Browser["Navegador Web"]
        APIClient["API Client"]
        App["Aplicación"]
    end
    
    subgraph API["⚙️ API REST (Node.js + Express)"]
        GuardarCtrl["Guardar Controller"]
        LeerCtrl["Leer Controller"]
        MetricsRoute["Métricas Routes"]
    end
    
    subgraph Fabric["⛓️ Hyperledger Fabric"]
        subgraph LightCh["Light Channel"]
            LightCC["jsonstoragemodel<br/>chaincode"]
        end
        subgraph HeavyCh["Heavy Channel"]
            HeavyCC["jsonstoragemodel<br/>chaincode"]
        end
        Wallet["🔐 Wallet<br/>Admin@org1.example.com"]
    end
    
    subgraph DB["🗄️ MySQL Database"]
        LightTable["light_model_data<br/>(JSON + metadata)"]
        HeavyTable["heavy_model_data<br/>(solo metadata)"]
    end
    
    subgraph Monitoring["📊 Monitoring"]
        Prometheus["Prometheus<br/>Metrics Server"]
    end
    
    Browser --> API
    APIClient --> API
    App --> API
    
    GuardarCtrl --> LightCC
    GuardarCtrl --> HeavyCC
    GuardarCtrl --> LightTable
    GuardarCtrl --> HeavyTable
    
    LeerCtrl --> LightCC
    LeerCtrl --> HeavyCC
    LeerCtrl --> LightTable
    
    MetricsRoute --> Prometheus
    
    LightCC -.-> LightTable
    HeavyCC -.-> HeavyTable
    
    Wallet -.autenticación.-> LightCC
    Wallet -.autenticación.-> HeavyCC
    
    style Cliente fill:#e1f5ff
    style API fill:#fff4e1
    style Fabric fill:#f0e1ff
    style DB fill:#e1ffe1
    style Monitoring fill:#ffe1e1
    style LightCC fill:#a8d5ff
    style HeavyCC fill:#ffa8d5
```

## Componentes Principales

| Componente | Tecnología | Función |
|-----------|-----------|---------|
| **Servidor API** | Node.js 14+ + Express 5.x | Manejo de peticiones HTTP y lógica de negocio |
| **Blockchain** | Hyperledger Fabric 2.2 | Almacenamiento inmutable de datos |
| **Base de Datos** | MySQL 8.0+ | Almacenamiento de metadatos y consultas rápidas |
| **Monitoreo** | Prometheus | Métricas de rendimiento y observabilidad |
| **Autenticación** | Fabric Wallet | Gestión de identidades y certificados |
