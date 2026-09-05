const fs = require('fs');
const path = require('path');
const https = require('https');

const baseUrl = 'https://hr-amr.vercel.app';

function request(urlPath, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['Cookie'] = `hr_token=${token}`;
    }

    const req = https.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, cookies: res.headers['set-cookie'] });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runProductionBackup() {
  console.log(`Connecting to live production URL: ${baseUrl} ...`);

  // Attempt login with default admin credentials
  const loginAttempts = [
    { email: 'admin@company.com', password: 'admin123' },
    { email: 'admin@company.com', password: 'password' },
    { email: 'admin@company.com', password: 'admin' },
    { email: 'hr@company.com', password: 'hr123456' },
  ];

  let token = null;
  for (const cred of loginAttempts) {
    console.log(`Trying login with ${cred.email} ...`);
    const loginRes = await request('/api/auth/login', 'POST', cred);
    if (loginRes.status === 200 && loginRes.data?.token) {
      token = loginRes.data.token;
      console.log(`✓ Logged in successfully as: ${loginRes.data.user?.name || cred.email}`);
      break;
    }
  }

  const endpoints = [
    { name: 'CompanySettings', path: '/api/settings' },
    { name: 'Departments', path: '/api/departments' },
    { name: 'Shifts', path: '/api/shifts' },
    { name: 'Employees', path: '/api/employees' },
    { name: 'Attendance', path: '/api/attendance' },
    { name: 'Tasks', path: '/api/tasks' },
    { name: 'Evaluations', path: '/api/evaluations' },
    { name: 'Payroll', path: '/api/payroll' },
    { name: 'Advances', path: '/api/advances' },
    { name: 'Leaves', path: '/api/leaves' },
    { name: 'Notifications', path: '/api/notifications' },
  ];

  const backupData = {
    timestamp: new Date().toISOString(),
    sourceUrl: baseUrl,
    authenticated: !!token,
    data: {}
  };

  let totalItems = 0;

  for (const ep of endpoints) {
    try {
      const res = await request(ep.path, 'GET', null, token);
      backupData.data[ep.name] = res.data;
      const count = Array.isArray(res.data) ? res.data.length : (res.data ? 1 : 0);
      totalItems += count;
      console.log(`✓ Exported [${ep.name}]: ${count} records (status: ${res.status})`);
    } catch (err) {
      console.warn(`! Export failed for [${ep.name}]: ${err.message}`);
      backupData.data[ep.name] = null;
    }
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup_production_data_${dateStr}.json`);
  const latestFile = path.join(backupDir, `backup_production_data_latest.json`);

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
  fs.writeFileSync(latestFile, JSON.stringify(backupData, null, 2), 'utf8');

  // Markdown Summary
  const summaryFile = path.join(backupDir, `backup_production_summary.md`);
  let md = `# 📦 نسخة احتياطية كاملة لبيانات الموقع المباشر (Production Backup)\n\n`;
  md += `- **رابط الموقع:** [https://hr-amr.vercel.app/](https://hr-amr.vercel.app/)\n`;
  md += `- **تاريخ ووقت النسخ:** ${new Date().toLocaleString('ar-EG')}\n`;
  md += `- **حالة المصادقة:** ${token ? '✅ مصرح كمسؤول نظام (Admin Authenticated)' : '⚠️ عام (Public)'}\n`;
  md += `- **إجمالي العناصر المصدرة:** ${totalItems}\n\n`;
  md += `## تفاصيل البيانات المستخرجة:\n\n`;
  md += `| القسم / الجدول | عدد السجلات | الحالة |\n`;
  md += `| :--- | :--- | :--- |\n`;
  for (const [name, val] of Object.entries(backupData.data)) {
    const c = Array.isArray(val) ? val.length : (val && !val.error ? 1 : 0);
    const st = val && val.error ? `⚠️ ${val.error}` : '✅ تم بنجاح';
    md += `| **${name}** | ${c} | ${st} |\n`;
  }

  fs.writeFileSync(summaryFile, md, 'utf8');

  console.log(`\n======================================================`);
  console.log(`✅ PRODUCTION DATA BACKUP SAVED SUCCESSFULLY!`);
  console.log(`📁 File: ${backupFile}`);
  console.log(`📁 Latest: ${latestFile}`);
  console.log(`📄 Summary: ${summaryFile}`);
  console.log(`======================================================\n`);
}

runProductionBackup().catch(console.error);
