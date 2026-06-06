const fs = require('fs');
const path = require('path');
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'password';
const EXPORT_DIR = path.join(__dirname, '../export_data');

async function createAndAuthPb() {
  const pb = new PocketBase(PB_URL);
  
  try {
    await pb.health.check();
    console.log('✓ PocketBase connection successful');
  } catch (error) {
    console.error('✗ PocketBase not available:', error.message);
    console.error('  Make sure PocketBase is running at:', PB_URL);
    process.exit(1);
  }

  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✓ Admin authentication successful');
  } catch (error) {
    console.error('✗ Admin authentication failed:', error.message);
    process.exit(1);
  }

  return pb;
}

async function exportAllCollections(pb) {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  const collections = await pb.collections.getFullList();
  console.log(`\nFound ${collections.length} collections`);

  const exportData = {};

  for (const collection of collections) {
    if (collection.type === 'view') {
      console.log(`- Skipping view collection: ${collection.name}`);
      continue;
    }

    if (collection.name.startsWith('_')) {
      console.log(`- Skipping system collection: ${collection.name}`);
      continue;
    }

    console.log(`- Exporting collection: ${collection.name}...`);
    
    try {
      const records = await pb.collection(collection.name).getFullList({
        sort: '-created',
        requestKey: collection.name,
      });
      
      exportData[collection.name] = records;
      console.log(`  ✓ Exported ${records.length} records`);
    } catch (error) {
      console.warn(`  ✗ Failed to export ${collection.name}: ${error.message}`);
      try {
        const records = await pb.collection(collection.name).getFullList(1000, 1, {
          sort: '-created',
        });
        exportData[collection.name] = records;
        console.log(`  ✓ Exported ${records.length} records (fallback method)`);
      } catch (fallbackError) {
        console.warn(`  ✗ Fallback also failed: ${fallbackError.message}`);
        exportData[collection.name] = [];
      }
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportFileName = `pocketbase_export_${timestamp}.json`;
  const exportFilePath = path.join(EXPORT_DIR, exportFileName);

  fs.writeFileSync(exportFilePath, JSON.stringify(exportData, null, 2));
  
  console.log(`\n✓ Export completed!`);
  console.log(`  File saved to: ${exportFilePath}`);
  console.log(`  Total collections exported: ${Object.keys(exportData).length}`);

  return exportFilePath;
}

async function exportSchema(pb) {
  console.log('\nExporting collection schemas...');
  
  const collections = await pb.collections.getFullList();
  
  const schemaData = collections
    .filter(c => !c.name.startsWith('_'))
    .map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      schema: c.schema,
      permissions: c.permissions,
    }));

  const schemaFilePath = path.join(EXPORT_DIR, 'pocketbase_schema_export.json');
  fs.writeFileSync(schemaFilePath, JSON.stringify(schemaData, null, 2));
  
  console.log(`✓ Schema exported to: ${schemaFilePath}`);
}

async function main() {
  console.log('========================================');
  console.log('  PocketBase Data Export Tool');
  console.log('========================================');
  
  const pb = await createAndAuthPb();
  await exportAllCollections(pb);
  await exportSchema(pb);
  
  console.log('\n========================================');
  console.log('  Export completed successfully!');
  console.log('========================================');
}

main().catch(console.error);