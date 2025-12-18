# Modelos de Datos: Light vs Heavy

Comparación visual de los dos modelos de almacenamiento implementados en la API.

![Comparación de Modelos](images/modelo-datos-comparacion.svg)

## Comparativa Detallada

![Características Detalladas](images/modelo-datos-caracteristicas.svg)

## Casos de Uso Recomendados

### 🪶 Light Model - Casos de Uso

![Casos de Uso Light Model](images/modelo-datos-light.svg)

### 🏋️ Heavy Model - Casos de Uso

![Casos de Uso Heavy Model](images/modelo-datos-heavy.svg)

## Flujo de Decisión: ¿Qué Modelo Usar?

![Flujo de Decisión](images/modelo-datos-decision.svg)

## Tabla Comparativa

| Característica | Light Model 🪶 | Heavy Model 🏋️ |
|---------------|----------------|-----------------|
| **Dato en Blockchain** | Hash SHA-256 (32 bytes) | JSON completo |
| **Dato en MySQL** | JSON completo | Solo metadatos |
| **Tamaño en Ledger** | Fijo, mínimo | Variable, según JSON |
| **Velocidad de escritura** | ⚡ Muy rápida | 🐢 Más lenta |
| **Inmutabilidad del contenido** | Parcial (hash) | Total (JSON) |
| **Verificabilidad** | Hash verificable | Contenido completo verificable |
| **Costo de almacenamiento** | 💰 Bajo en blockchain | 💎 Alto en blockchain |
| **Consultas** | ⚡ Muy rápidas (MySQL) | 🔍 Desde blockchain |
