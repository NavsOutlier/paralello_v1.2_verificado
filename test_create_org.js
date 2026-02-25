const https = require('https');
const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].replace('\r', '');
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const key = env['VITE_SUPABASE_ANON_KEY'];
const hostname = supabaseUrl.replace('https://', '');

const payload = JSON.stringify({
    organization: { name: "Test Org 3", slug: "test-org-3" },
    owner_email: "test3@example.com",
    owner_name: "Test Owner 3",
    plan: "agencia",
    billing_document: "12345678901",
    billing_email: "test3@example.com",
    billing_phone: "11999999999",
    activate_billing: true,
    contracted_clients: 10,
    max_users: 10,
    billing_value: 100
});

const options = {
    hostname: hostname,
    port: 443,
    path: '/functions/v1/create-org-with-owner',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'Content-Length': payload.length
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Data: ${data}`);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(payload);
req.end();
