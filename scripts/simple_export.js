const fs = require('fs');
const path = require('path');
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'password';
const EXPORT_DIR = path.join(__dirname, '../export_data');

async function main() {
  console.log('Connecting to PocketBase:', PB_URL);
  
  const pb = new PocketBase(PB_URL);
  
  await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
  console.log('✓ Admin authentication successful');

  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  const collections = ['games', 'questions', 'players', 'game_results', 'users'];
  const exportData = {};

  for (const collectionName of collections) {
    console.log(`Exporting ${collectionName}...`);
    try {
      const records = await pb.collection(collectionName).getFullList(200);
      exportData[collectionName] = records;
      console.log(`  ✓ ${records.length} records`);
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      exportData[collectionName] = [];
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportFileName = `pocketbase_export_${timestamp}.json`;
  const exportFilePath = path.join(EXPORT_DIR, exportFileName);

  fs.writeFileSync(exportFilePath, JSON.stringify(exportData, null, 2));
  console.log(`\n✓ Export saved to: ${exportFilePath}`);
}

main().catch(console.error);