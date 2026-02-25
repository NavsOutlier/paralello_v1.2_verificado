const envText = await Deno.readTextFile('.env.local');
const env = {};
envText.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].replace('\r', '');
});

const url = env['VITE_SUPABASE_URL'] + '/functions/v1/create-org-with-owner';
const key = env['VITE_SUPABASE_ANON_KEY'];

const payload = {
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
};

console.log("Chamando URL:", url);

try {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(payload)
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log('Response:', text);
} catch (err) {
    console.error('Error:', err);
}
