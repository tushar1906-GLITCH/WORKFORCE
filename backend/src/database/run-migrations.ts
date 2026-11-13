import { AppDataSource } from './data-source';

async function run() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Connected! Running migrations...');
    const migrations = await AppDataSource.runMigrations();
    console.log(`Executed ${migrations.length} migration(s) successfully!`);
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();
