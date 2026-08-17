const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;
const APK_PATH = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  if (req.url === '/download' || req.url === '/app-debug.apk') {
    if (!fs.existsSync(APK_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('APK file not found. Please compile the app first using "npm run build:apk".');
      return;
    }
    const stat = fs.statSync(APK_PATH);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename=meyyurai-app.apk',
    });
    const readStream = fs.createReadStream(APK_PATH);
    readStream.pipe(res);
  } else {
    const apkExists = fs.existsSync(APK_PATH);
    const apkSizeMb = apkExists ? (fs.statSync(APK_PATH).size / (1024 * 1024)).toFixed(1) : 0;

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Download Meyyurai Mobile App</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #091E1C; color: #E2E8F0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: #132E2B; border: 1px solid #1E4642; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .icon { width: 72px; height: 72px; background: #00D4B1; color: #091E1C; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; margin: 0 auto 20px; }
        h1 { color: #FFFFFF; font-size: 24px; margin-bottom: 8px; }
        p { color: #94A3B8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
        .btn { display: inline-block; width: 100%; background: #00D4B1; color: #091E1C; font-weight: bold; text-decoration: none; padding: 16px 24px; border-radius: 12px; font-size: 16px; transition: all 0.2s; box-shadow: 0 4px 14px rgba(0, 212, 177, 0.4); }
        .btn:hover { background: #00B89A; transform: translateY(-1px); }
        .btn-disabled { background: #334155; color: #64748B; box-shadow: none; pointer-events: none; }
        .instructions { margin-top: 28px; text-align: left; background: #0B2523; padding: 16px; border-radius: 10px; font-size: 13px; color: #CBD5E1; border: 1px solid #1A3B37; }
        .instructions h3 { font-size: 14px; color: #00D4B1; margin-bottom: 8px; }
        .instructions ol { padding-left: 18px; line-height: 1.6; }
        .badge { display: inline-block; background: #1E3A37; color: #2DD4BF; font-size: 12px; padding: 4px 10px; border-radius: 999px; margin-bottom: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">M</div>
        <h1>Meyyurai Mobile App</h1>
        <span class="badge">${apkExists ? `Ready (${apkSizeMb} MB)` : 'APK Not Compiled'}</span>
        <p>Download and install the official Meyyurai Mobile App directly on your Android phone.</p>
        
        ${apkExists 
          ? `<a href="/download" class="btn">📱 Download APK File</a>`
          : `<div class="btn btn-disabled">APK Not Found (Please build first)</div>`
        }

        <div class="instructions">
          <h3>📌 How to install on your phone:</h3>
          <ol>
            <li>Tap <b>Download APK File</b> above.</li>
            <li>When downloaded, open the <code>meyyurai-app.apk</code> file.</li>
            <li>If prompted, tap <b>Settings</b> and enable <b>"Allow from this source"</b>.</li>
            <li>Tap <b>Install</b> and open Meyyurai!</li>
          </ol>
        </div>
      </div>
    </body>
    </html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }
});

server.listen(PORT, () => {
  const ips = getLocalIpAddresses();
  console.log(`\n==================================================`);
  console.log(`🚀 Meyyurai APK Download Server is Running!`);
  console.log(`==================================================\n`);
  console.log(`Local Access (on this PC):`);
  console.log(`👉 http://localhost:${PORT}\n`);
  console.log(`Mobile Access (Connect phone to same Wi-Fi):`);
  ips.forEach(ip => {
    console.log(`👉 http://${ip}:${PORT}`);
  });
  console.log(`\nOpen any of the Mobile Access links in your phone browser!`);
  console.log(`==================================================\n`);
});
