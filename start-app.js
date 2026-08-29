// eslint-disable-next-line @typescript-eslint/no-require-imports
const net = require('net');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { spawn } = require('child_process');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const os = require('os');

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
    console.log('🚀 System is starting...');
    console.log(`📡 Found free port: ${port}`);
    console.log(`📱 To test from mobile, open: http://${ip}:${port}`);
    console.log('=========================================\n');

    // Run next dev on 0.0.0.0
    const nextProcess = spawn('npx', ['next', 'dev', '-H', '0.0.0.0', '-p', port.toString()], {
      stdio: 'inherit',
      shell: true
    });

    nextProcess.on('close', (code) => {
      console.log(`Process exited with code ${code}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
  }
}

start();
