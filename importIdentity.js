const fs = require('fs');
const path = require('path');
const { Wallets, X509Identity } = require('fabric-network');

async function main() {
  try {
    const credPath = path.join(
      __dirname,
      '..',
      'ALBA-Blockchain',
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

    // Si existe, eliminar la identidad anterior
    const exists = await wallet.get(identityLabel);
    if (exists) {
      await wallet.remove(identityLabel);
      console.log(`⚠️ Identidad existente '${identityLabel}' eliminada de la wallet.`);
    }

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
    console.error(`❌ Error importando identidad: ${error.message}`);
    process.exit(1);
  }
}

main();
