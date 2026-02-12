const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const fetch = require("node-fetch");

// Use Firebase Functions secrets/config
// Set with: firebase functions:secrets:set CH_API_KEY
const chApiKeySecret = defineSecret("CH_API_KEY");
const CH_BASE = "https://api.company-information.service.gov.uk";

const ALLOWED_ORIGINS = [
  "https://isf-assess.web.app",
  "https://isf-assess.firebaseapp.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req) {
  const origin = req.headers.origin || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "3600",
  };
}

// Proxy for Companies House API
exports.companiesHouse = onRequest(
  { region: "europe-west2", cors: false, secrets: [chApiKeySecret] },
  async (req, res) => {
    const CH_API_KEY = chApiKeySecret.value();
    const corsHeaders = getCorsHeaders(req);

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.set(corsHeaders);
      return res.status(204).send("");
    }

    res.set(corsHeaders);

    const path = req.query.path;
    if (!path) {
      return res.status(400).json({ error: "Missing 'path' query parameter" });
    }

    // Only allow specific safe paths
    const safePaths = [
      /^\/company\/[A-Z0-9]+$/i,
      /^\/company\/[A-Z0-9]+\/officers$/i,
      /^\/company\/[A-Z0-9]+\/filing-history$/i,
      /^\/company\/[A-Z0-9]+\/charges$/i,
      /^\/search\/companies$/i,
    ];

    if (!safePaths.some((re) => re.test(path))) {
      return res.status(400).json({ error: "Path not allowed" });
    }

    try {
      // Build the full URL, preserving query params
      let url = `${CH_BASE}${path}`;
      const queryParams = { ...req.query };
      delete queryParams.path;
      const qs = new URLSearchParams(queryParams).toString();
      if (qs) url += `?${qs}`;

      const chRes = await fetch(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(CH_API_KEY + ":").toString("base64")}`,
          Accept: "application/json",
        },
      });

      const data = await chRes.json();
      res.status(chRes.status).json(data);
    } catch (err) {
      console.error("Companies House proxy error:", err);
      res.status(500).json({ error: "Proxy request failed" });
    }
  }
);
