const express = require('express');
const cors = require('cors');

const CH_API_KEY = '25a59c7c-1311-4a91-a4c6-fe92c543bcfe';
const CH_BASE = 'https://api.company-information.service.gov.uk';
const PORT = 3847;

const ALLOWED_ORIGINS = [
  'https://isf-assess.web.app',
  'https://isf-assess.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));

// Rate limiting: simple in-memory counter
let requestCount = 0;
setInterval(() => { requestCount = 0; }, 60000);

const SAFE_PATHS = [
  /^\/company\/[A-Z0-9]+$/i,
  /^\/company\/[A-Z0-9]+\/officers$/i,
  /^\/company\/[A-Z0-9]+\/filing-history$/i,
  /^\/company\/[A-Z0-9]+\/charges$/i,
  /^\/search\/companies$/i,
];

// Use query param: /ch?path=/company/00991413
app.get('/ch', async (req, res) => {
  const path = req.query.path;

  if (!path) {
    return res.status(400).json({ error: "Missing 'path' query parameter" });
  }

  if (!SAFE_PATHS.some(re => re.test(path))) {
    return res.status(400).json({ error: 'Path not allowed' });
  }

  if (requestCount > 500) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  requestCount++;

  try {
    const url = `${CH_BASE}${path}`;
    const chRes = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(CH_API_KEY + ':').toString('base64')}`,
        Accept: 'application/json',
      },
    });
    const data = await chRes.json();
    res.set('Cache-Control', 'public, max-age=86400');
    res.status(chRes.status).json(data);
  } catch (err) {
    console.error('CH proxy error:', err.message);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CH proxy running on port ${PORT}`);
});
