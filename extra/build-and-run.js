// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync, spawn } = require('child_process');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const net = require('net');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const os = require('os');

// Helper to set PATH
const nodePath = "C:\\Users\\super-magic\\Downloads\\nodejs\\node-v22.23.2-win-x64";
const envWithNode = { ...process.env, PATH: `${nodePath};${process.env.PATH}` };

// 1. Build the app
console.log('Building the Next.js application...');
try {
  execSync('npm.cmd run build', { stdio: 'inherit', env: envWithNode });
} catch (err) {
  console.error('Build failed');
  process.exit(1);
}

// 2. Prepare the standalone folder
const standaloneDir = path.join(__dirname, '.next', 'standalone');
const staticDir = path.join(__dirname, '.next', 'static');
const publicDir = path.join(__dirname, 'public');

const destStatic = path.join(standaloneDir, '.next', 'static');
const destPublic = path.join(standaloneDir, 'public');

console.log('Copying static assets to standalone folder...');
fs.cpSync(staticDir, destStatic, { recursive: true });

if (fs.existsSync(publicDir)) {
  console.log('Copying public directory to standalone folder...');
  fs.cpSync(publicDir, destPublic, { recursive: true });
}

const prismaSource = path.join(__dirname, 'prisma');
const prismaDest = path.join(standaloneDir, 'prisma');
if (fs.existsSync(prismaSource)) {
  console.log('Copying prisma database to standalone folder...');
  fs.cpSync(prismaSource, prismaDest, { recursive: true });
}

console.log('Standalone build is ready at: ' + standaloneDir);

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, '0.0.0.0', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findFreePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

async function start() {
  try {
    const port = await findFreePort(3000);
    const ip = getLocalIp();
    
    console.log('\n=========================================');
    console.log('🚀 Running Standalone App...');
    console.log(`📡 Found free port: ${port}`);
    console.log(`📱 To test from mobile, open: http://${ip}:${port}`);
    console.log('=========================================\n');

    const serverScript = path.join(standaloneDir, 'server.js');
    
    // Set HOST and PORT env vars for the standalone server
    const runEnv = { ...envWithNode, HOSTNAME: '0.0.0.0', PORT: port.toString() };

    const serverProcess = spawn(path.join(nodePath, 'node.exe'), [serverScript], {
      stdio: 'inherit',
      env: runEnv
    });

    serverProcess.on('close', (code) => {
      console.log(`Process exited with code ${code}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
  }
}

start();
