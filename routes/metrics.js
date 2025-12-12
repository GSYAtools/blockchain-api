// routes/metrics.js
require('dotenv').config();
const express = require('express');
const { fetch } = require('undici');
const mysql   = require('mysql2/promise');

const router = express.Router();

// Pool de MySQL (igual que en app.js)
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     parseInt(process.env.DB_PORT, 10) || 3306,
  charset:  'utf8mb4'
});

// URL de Prometheus
const PROM = process.env.PROMETHEUS_URL;
if (!PROM) console.error('❌ PROMETHEUS_URL no definido en .env');

/**
 * Ejecuta una consulta range en Prometheus y devuelve
 * el último punto de la primera serie (o 0 si no hay datos).
 */
async function queryLast(expr, start, end, step) {
  const url = `${PROM}/api/v1/query_range`
            + `?query=${encodeURIComponent(expr)}`
            + `&start=${start}&end=${end}&step=${step}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const { data } = await resp.json();
  const series = data.result;
  if (!series.length || !series[0].values.length) return 0;
  const last = series[0].values[series[0].values.length - 1];
  return parseFloat(last[1]) || 0;
}

router.get('/tx/:txid', async (req, res) => {
  const { txid } = req.params;

  try {
    // 1) Recuperar timestamp y nanosegundos
    const [[rec]] = await pool.query(
      `SELECT timestamp, start_tx_ns, end_tx_ns
         FROM light_model_data WHERE tx_id = ?
       UNION
       SELECT timestamp, start_tx_ns, end_tx_ns
         FROM heavy_model_data WHERE tx_id = ?
       LIMIT 1`,
      [txid, txid]
    );
    if (!rec) {
      return res.status(404).json({ error: 'tx_id no encontrado' });
    }

    // 2) Calcular start/end en segundos UNIX y step
    const tsEpoch = new Date(rec.timestamp).getTime() / 1000;
    const delta   = (Number(rec.end_tx_ns) - Number(rec.start_tx_ns)) / 1e9;
    const start   = tsEpoch;
    const end     = tsEpoch + delta;
    const step    = Math.max(delta / 50, 0.1);

    // 3) Definir PromQL (multiplicando *1e6 para convertir a μs donde aplique)
    const queries = {
      // Bloques
      blockLatency95: `
        histogram_quantile(
          0.95,
          sum(rate(peer_block_commit_duration_seconds_bucket{
            channel="lightchannel"
          }[1m])) by (le)
        ) * 1e6`,
      blocksPerSec: `
        rate(peer_committed_block_total{
          channel="lightchannel"
        }[1m])`,
      blockchainHeight: `ledger_blockchain_height`,

      // Sistema
      systemCpuPct: `
        100 - (
          avg(rate(node_cpu_seconds_total{
            job="node",mode="idle"
          }[1m])) * 100
        )`,
      hostMemUsagePct: `
        ((node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          / node_memory_MemTotal_bytes) * 100`,

      // Peer
      peerCpuPct: `
        100 * rate(process_cpu_seconds_total{
          job="peer0_org1"
        }[1m])`,
      peerMemBytes: `
        process_resident_memory_bytes{
          job="peer0_org1"
        }`,

      // Contenedores
      containerCount: `
        count(container_last_seen{
          name!~"cadvisor|node-exporter|grafana|prometheus"
        })`,
      totalContainerMem: `
        sum(container_memory_usage_bytes{
          name!~"cadvisor|node-exporter|grafana|prometheus"
        }) - sum(container_memory_cache{
          name!~"cadvisor|node-exporter|grafana|prometheus"
        })`,

      // Chaincode shim
      shimReqDuration: `
        (
          sum by(job,chaincode)(
            rate(chaincode_shim_request_duration_sum{
              chaincode!~"_lifecycle.*|cscc|qscc"
            }[1m])
          )
          /
          sum by(job,chaincode)(
            rate(chaincode_shim_request_duration_count{
              chaincode!~"_lifecycle.*|cscc|qscc"
            }[1m])
          )
        ) * 1e6`,
      shimReqReceived: `
        sum without(channel,type)(
          rate(chaincode_shim_requests_received{
            chaincode!~"_lifecycle.*|cscc|qscc"
          }[1m])
        )`,
      shimReqCompleted: `
        sum by(chaincode,job)(
          rate(chaincode_shim_requests_completed{
            chaincode!~"_lifecycle.*|cscc|qscc"
          }[1m])
        )`,

      // Endorser
      proposalDuration: `
        (
          sum without(channel,chaincode)(
            rate(endorser_proposal_duration_sum{
              chaincode!~"cscc|qscc|_lifecycle.*",success="true"
            }[1m])
          )
          /
          sum without(channel,chaincode)(
            rate(endorser_proposal_duration_count{
              chaincode!~"cscc|qscc|_lifecycle.*",success="true"
            }[1m])
          )
        ) * 1e6`,
      proposalsReceived: `rate(endorser_proposals_received[1m])`,
      proposalsSuccessful:`rate(endorser_successful_proposals[1m])`,

      // Ledger
      blockProcessingTime: `
        (
          sum without(channel)(
            rate(ledger_block_processing_time_sum[1m])
          )
          /
          sum without(channel)(
            rate(ledger_block_processing_time_count[1m])
          )
        ) * 1e6`,
      blockStorageCommitTime: `
        (
          sum without(channel)(
            rate(ledger_blockstorage_commit_time_sum[1m])
          )
          /
          sum without(channel)(
            rate(ledger_blockstorage_commit_time_count[1m])
          )
        ) * 1e6`,
      stateDbCommitTime: `
        (
          sum without(channel)(
            rate(ledger_statedb_commit_time_sum[1m])
          )
          /
          sum without(channel)(
            rate(ledger_statedb_commit_time_count[1m])
          )
        ) * 1e6`
    };

    // 4) Ejecutar queries y extraer último valor
    const metrics = {};
    await Promise.all(Object.entries(queries).map(async ([name, expr]) => {
      try {
        metrics[name] = await queryLast(expr, start, end, step);
      } catch (e) {
        console.error(`Error en ${name}:`, e.message);
        metrics[name] = 0;
      }
    }));

    // 5) Responder
    res.json({
      txid,
      window: { start, end, duration: delta },
      metrics
    });
  } catch (err) {
    console.error('Error en /metrics/tx/:txid:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
