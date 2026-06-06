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

async function importDataToPocketBase(pb, exportFilePath) {
  if (!fs.existsSync(exportFilePath)) {
    console.error(`✗ Export file not found: ${exportFilePath}`);
    process.exit(1);
  }

  const exportData = JSON.parse(fs.readFileSync(exportFilePath, 'utf-8'));
  const collections = Object.keys(exportData);
  
  console.log(`\nFound ${collections.length} collections in export file`);

  for (const collectionName of collections) {
    const records = exportData[collectionName];
    
    if (!Array.isArray(records) || records.length === 0) {
      console.log(`- Skipping empty collection: ${collectionName}`);
      continue;
    }

    console.log(`- Importing collection: ${collectionName} (${records.length} records)...`);
    
    let successCount = 0;
    let failCount = 0;

    for (const record of records) {
      try {
        const { id, ...recordWithoutId } = record;
        await pb.collection(collectionName).create(recordWithoutId);
        successCount++;
      } catch (createError) {
        failCount++;
        console.warn(`  - Failed to import record: ${createError.message}`);
      }
    }

    console.log(`  ✓ Imported: ${successCount}, Failed: ${failCount}`);
  }

  console.log('\n✓ Import completed!');
}

async function importSchema(pb, schemaFilePath) {
  console.log('\nImporting collection schemas...');
  
  if (!fs.existsSync(schemaFilePath)) {
    console.log('  - Schema file not found, skipping');
    return;
  }

  const schemaData = JSON.parse(fs.readFileSync(schemaFilePath, 'utf-8'));
  
  for (const config of schemaData) {
    try {
      const existing = await pb.collections.getOne(config.id);
      await pb.collections.update(config.id, {
        name: config.name,
        schema: config.schema,
        permissions: config.permissions,
      });
      console.log(`  ✓ Updated schema: ${config.name}`);
    } catch (error) {
      try {
        await pb.collections.create(config);
        console.log(`  ✓ Created schema: ${config.name}`);
      } catch (createError) {
        console.warn(`  ✗ Failed to create schema ${config.name}: ${createError.message}`);
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('✗ Usage: node import_pocketbase_data.js <export_file.json>');
    process.exit(1);
  }

  const exportFilePath = path.resolve(args[0]);
  
  console.log('========================================');
  console.log('  PocketBase Data Import Tool');
  console.log('========================================');
  
  const pb = await createAndAuthPb();
  const schemaFilePath = path.join(EXPORT_DIR, 'pocketbase_schema_export.json');
  await importSchema(pb, schemaFilePath);
  await importDataToPocketBase(pb, exportFilePath);
  
  console.log('\n========================================');
  console.log('  Import completed successfully!');
  console.log('========================================');
}

main().catch(console.error);