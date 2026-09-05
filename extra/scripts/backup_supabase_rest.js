const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const https = require('https');

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '..', '.env.vercel')));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || envConfig.SUPABASE_URL;
const serviceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_ANON_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Connecting via Supabase REST API:");
console.log("- URL:", supabaseUrl);
console.log("- Key present:", !!serviceKey);

function fetchTable(table) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${supabaseUrl}/rest/v1/${table}?select=*`);
    const options = {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } else {
            resolve({ error: `HTTP ${res.statusCode}: ${data}` });
          }
        } catch (e) {
          resolve({ error: e.message, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ error: err.message });
    });

    req.end();
  });
}

async function runBackup() {
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
    source: "https://hr-amr.vercel.app/ (Supabase Cloud Database)",
    supabaseProject: supabaseUrl,
    tables: {}
  };

  let totalRecords = 0;
  for (const table of tables) {
    const records = await fetchTable(table);
    if (Array.isArray(records)) {
      backupData.tables[table] = records;
      totalRecords += records.length;
      console.log(`✓ [${table}]: ${records.length} records exported`);
    } else {
      console.log(`! [${table}]: ${JSON.stringify(records)}`);
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

  // Also write a human readable summary
  const summaryPath = path.join(backupDir, `backup_summary.md`);
  let summaryContent = `# 📦 تقرير النسخة الاحتياطية لبيانات الموقع\n\n`;
  summaryContent += `**تاريخ النسخ:** ${new Date().toLocaleString('ar-EG')}\n`;
  summaryContent += `**المصدر:** ${backupData.source}\n`;
  summaryContent += `**إجمالي السجلات المحفوظة:** ${totalRecords}\n\n`;
  summaryContent += `## تفاصيل الجداول المصدرة:\n\n`;
  summaryContent += `| اسم الجدول | عدد السجلات |\n`;
  summaryContent += `| :--- | :--- |\n`;
  for (const [tbl, rows] of Object.entries(backupData.tables)) {
    summaryContent += `| **${tbl}** | ${Array.isArray(rows) ? rows.length : 0} |\n`;
  }
  fs.writeFileSync(summaryPath, summaryContent, 'utf8');

  console.log(`\n======================================================`);
  console.log(`✅ COMPLETE LIVE DATA BACKUP CREATED SUCCESSFULLY!`);
  console.log(`📁 File saved at: ${backupFilePath}`);
  console.log(`📁 Latest file:   ${latestFilePath}`);
  console.log(`📋 Summary file:  ${summaryPath}`);
  console.log(`📊 Total Records: ${totalRecords}`);
  console.log(`======================================================\n`);
}

runBackup().catch(err => {
  console.error("Backup failed:", err);
});
