import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase SERVICE ROLE credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    console.log("Checking meta_connections table...");
    const { data: metaConns, error: metaErr } = await supabase.from('meta_connections').select('*');
    if (metaErr) console.error("Error fetching meta_connections:", metaErr.message);
    else console.log(`Found ${metaConns?.length || 0} meta connections.`);
    if (metaConns && metaConns.length > 0) console.log("Connections:", JSON.stringify(metaConns, null, 2));

    console.log("\nChecking client_integrations table for provider='meta'...");
    const { data: integrations, error: intErr } = await supabase.from('client_integrations').select('*').eq('provider', 'meta');
    if (intErr) console.error("Error fetching client_integrations:", intErr.message);
    else console.log(`Found ${integrations?.length || 0} meta client integrations.`);
    if (integrations && integrations.length > 0) console.log("Integrations:", JSON.stringify(integrations, null, 2));

    console.log("\nChecking meta_ad_accounts table...");
    const { data: ads, error: adsErr } = await supabase.from('meta_ad_accounts').select('*');
    if (adsErr) console.error("Error fetching meta_ad_accounts:", adsErr.message);
    else console.log(`Found ${ads?.length || 0} ad accounts.`);
}

checkDatabase();
