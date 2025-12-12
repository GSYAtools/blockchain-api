const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const origen = path.resolve(
      __dirname,
      '../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json'
    );

    const destino = path.resolve(__dirname, 'connection-org1.json');

    if (!fs.existsSync(origen)) {
      console.error('❌ No se encontró el archivo de origen:', origen);
      process.exit(1);
    }

    fs.copyFileSync(origen, destino);
    console.log('✅ Archivo connection-org1.json copiado y sobrescrito con éxito en fabric-api/');
  } catch (error) {
    console.error('❌ Error al copiar el archivo de conexión:', error.message);
    process.exit(1);
  }
}

main();
