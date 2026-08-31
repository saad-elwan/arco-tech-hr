const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '..', '.env.vercel')));

console.log("Connecting via Host config:");
console.log("- Host:", envConfig.POSTGRES_HOST);
console.log("- User:", envConfig.POSTGRES_USER);
console.log("- Database:", envConfig.POSTGRES_DATABASE);

// Supabase direct connection or transaction pooler (port 5432 or 6543)
const pool = new Pool({
  host: envConfig.POSTGRES_HOST,
  port: 5432,
  user: envConfig.POSTGRES_USER,
  password: envConfig.POSTGRES_PASSWORD,
  database: envConfig.POSTGRES_DATABASE,
  ssl: { rejectUnauthorized: false }
});

async function runBackup() {
  const client = await pool.connect();
  try {
    console.log("Connected to Supabase PostgreSQL successfully!");

    const tables = [
      'Company',
      'Department',
      'Shift',
      'Employee',
      'Attendance',
      'Task',
      'TaskComment',
      'Evaluation',
      'Payroll',
      'LocationLog',
      'AdvanceRequest',
      'LeaveRequest',
      'Notification'
    ];

    const backupData = {
      timestamp: new Date().toISOString(),
      source: "https://hr-amr.vercel.app/ (Supabase Live Production Database)",
      databaseHost: envConfig.POSTGRES_HOST,
      tables: {}
    };

    let totalRecords = 0;
    for (const table of tables) {
      try {
        const res = await client.query(`SELECT * FROM "${table}"`);
        backupData.tables[table] = res.rows;
        totalRecords += res.rows.length;
        console.log(`✓ [${table}]: ${res.rows.length} records exported`);
      } catch (err) {
        console.warn(`! [${table}]: Notice - ${err.message}`);
        backupData.tables[table] = [];
      }
    }

    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `backup_live_data_${dateStr}.json`);
    const latestFilePath = path.join(backupDir, `backup_live_data_latest.json`);
    
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
    fs.writeFileSync(latestFilePath, JSON.stringify(backupData, null, 2), 'utf8');

    console.log(`\n======================================================`);
    console.log(`✅ COMPLETE LIVE DATA BACKUP CREATED SUCCESSFULLY!`);
    console.log(`📁 Saved to: ${backupFilePath}`);
    console.log(`📁 Latest:   ${latestFilePath}`);
    console.log(`📊 Total Records Exported: ${totalRecords}`);
    console.log(`======================================================\n`);

  } finally {
    client.release();
    await pool.end();
  }
}

runBackup().catch(err => {
  console.error("Backup failed:", err);
  process.exit(1);
});
