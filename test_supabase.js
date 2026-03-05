import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fhfamquilobeoibqfhwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZmFtcXVpbG9iZW9pYnFmaHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjE0ODksImV4cCI6MjA4MjY5NzQ4OX0.pHhokXv_POA3oWfG3GuJ9W3SEBoD6dyykiAIGF2gzSM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLengths() {
    const { count: countC, error: errC } = await supabase.from('v_meta_campaign_insights').select('*', { count: 'exact', head: true });
    console.log("v_meta_campaign_insights count:", countC, errC);

    const { count: countI, error: errI } = await supabase.from('meta_insights').select('*', { count: 'exact', head: true });
    console.log("meta_insights raw count:", countI, errI);

    const { data: cData } = await supabase.from('v_meta_campaign_insights').select('organization_id, client_id').limit(1);
    console.log("v_meta_campaign_insights sample org_id/client_id:", cData);

    const { data: actData } = await supabase.from('meta_ad_accounts').select('organization_id, account_id').limit(1);
    console.log("meta_ad_accounts sample:", actData);
}

checkLengths();
