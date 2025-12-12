// Modo oscuro
function toggleModo() {
  const dark = document.body.classList.toggle('dark');
  localStorage.setItem('modoOscuro', dark ? '1' : '0');
}
function aplicarModoGuardado() {
  if (localStorage.getItem('modoOscuro') === '1') {
    document.body.classList.add('dark');
  }
}

// Pintar tablas con diferencia en ns
async function cargarRegistros() {
  const res = await fetch('/registros');
  const { light, heavy } = await res.json();
  document.getElementById('last-update').textContent =
    `(última actualización: ${new Date().toLocaleTimeString()})`;

  const pintar = (arr, tbodyId, tipo) => {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';
    arr.forEach(r => {
      const diffNs = BigInt(r.end_tx_ns) - BigInt(r.start_tx_ns);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${r.id}</td>
        <td>${new Date(r.timestamp).toLocaleString()}</td>
        <td>${diffNs.toString()} ns</td>
        <td>
          <button onclick="verJson('${tipo}','${r.tx_id}')">
            Ver ${tipo}
          </button>
        </td>`;
      tbody.appendChild(row);
    });
  };

  pintar(light, 'tabla-light', 'light');
  pintar(heavy, 'tabla-heavy', 'heavy');
}

function verJson(tipo, txid) {
  window.open(`/ver-json.html?tipo=${tipo}&txid=${txid}`, '_blank');
}

// Init
aplicarModoGuardado();
document.getElementById('btn-modo').onclick = toggleModo;
cargarRegistros();
setInterval(cargarRegistros, 10000);
