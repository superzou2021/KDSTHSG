const fs = require('fs');
const path = require('path');
const PocketBase = require('pocketbase/cjs');

const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@example.com';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'password';

async function main() {
  console.log('Connecting to PocketBase:', PB_URL);
  
  const pb = new PocketBase(PB_URL);
  
  try {
    await pb.health.check();
    console.log('✓ PocketBase is healthy');
  } catch (error) {
    console.error('✗ PocketBase not available:', error.message);
    process.exit(1);
  }

  try {
    await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
    console.log('✓ Admin authentication successful');
  } catch (error) {
    console.error('✗ Admin authentication failed:', error.message);
    process.exit(1);
  }

  const questionsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'questions_import_48_records.json'), 'utf-8'));
  
  console.log(`\nImporting ${questionsData.length} questions...`);
  
  let successCount = 0;
  let failCount = 0;

  for (const question of questionsData) {
    try {
      const existing = await pb.collection('questions').getFirstListItem(`title = "${question.title}"`);
      await pb.collection('questions').update(existing.id, question);
      successCount++;
    } catch {
      try {
        await pb.collection('questions').create(question);
        successCount++;
      } catch (error) {
        failCount++;
        console.warn(`- Failed to import question: ${question.title}`);
      }
    }
  }

  console.log(`\n✓ Import completed: ${successCount} success, ${failCount} failed`);
}

main().catch(console.error);