/**
 * Lightweight Companies House CORS proxy
 * Runs on port 3456, proxies requests to the CH API
 */
const http = require('http');
const https = require('https');

const CH_API_KEY = '25a59c7c-1311-4a91-a4c6-fe92c543bcfe';
const PORT = 3456;

const ALLOWED_ORIGINS = [
  'https://isf-assess.web.app',
  'https://isf-assess.firebaseapp.com',
  'http://localhost:5173',
];

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.searchParams.get('path');
  
  if (!path || !path.startsWith('/')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Missing path parameter' }));
  }

  // Build CH URL
  const params = new URLSearchParams(url.searchParams);
  params.delete('path');
  const qs = params.toString();
  const chUrl = `https://api.company-information.service.gov.uk${path}${qs ? '?' + qs : ''}`;

  const authHeader = 'Basic ' + Buffer.from(CH_API_KEY + ':').toString('base64');
  
  https.get(chUrl, { headers: { Authorization: authHeader, Accept: 'application/json' } }, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
      res.end(data);
    });
  }).on('error', (err) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  });
});

server.listen(PORT, () => console.log(`CH proxy running on :${PORT}`));
