import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const envVars = Object.fromEntries(
    envConfig.split('\n').map(line => line.split('=')).filter(arr => arr.length >= 2)
);

const supabaseUrl = envVars['VITE_SUPABASE_URL']?.trim();
const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY']?.trim();

console.log('🔗 Connecting to Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log('🚀 Starting Automation Logic Test...');

    // 1. Check Messages (Just for info)
    console.log('\n📨 Checking Scheduled Messages...');
    const { data: messages } = await supabase
        .from('scheduled_messages')
        .select('*, client:clients(name, whatsapp, whatsapp_group_id)')
        .eq('status', 'pending');

    if (messages && messages.length > 0) {
        console.log(`Found ${messages.length} pending messages.`);
    } else {
        console.log('No visible pending messages (0 found or RLS restricted).');
    }

    // 2. Check Reports
    console.log('\n📊 Checking Scheduled Reports...');
    // Force retrieval
    const { data: reports } = await supabase
        .from('scheduled_reports')
        .select('*, client:clients(name, whatsapp, whatsapp_group_id)')
        .eq('is_active', true);

    let reportsData = reports;

    // !!! FALLBACK FOR TESTING !!!
    // If RLS hides everything (script is anon), create a Mock to prove logic
    if (!reportsData || reportsData.length === 0) {
        console.log('⚠️ No reports accessible (likely due to RLS/Security for Anon User).');
        console.log('👉 Switching to **MOCK DATA** to demonstrate the LOGIC generation.');

        reportsData = [{
            id: 'mock-report-1',
            client_id: 'mock-client-1',
            organization_id: 'mock-org-1',
            frequency: 'daily',
            template: 'Olá *{{client_nome}}*! 🚀\nResumo de ontem:\n\n💰 Investimento: *{{spend}}*\n👥 Leads: *{{leads}}*\n📉 CPL: *{{cpl}}*\n📈 ROAS: *{{roas}}*',
            client: {
                name: 'Cliente Teste (Simulação)',
                whatsapp: '5511999999999',
                whatsapp_group_id: null
            },
            next_run: new Date().toISOString()
        }] as any;
    }

    for (const report of reportsData || []) {
        console.log('------------------------------------------------');
        console.log(`[REPORT] Processing for: ${report.client?.name} (${report.frequency})`);

        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);
        const startDate = new Date(endDate);
        const periodText = endDate.toLocaleDateString('pt-BR');

        let leadsCount = 0;
        let investment = 0;

        if (report.id.startsWith('mock-')) {
            console.log('> Using MOCK METRICS (Simulating database fetch)');
            leadsCount = 15;
            investment = 350.50;
        } else {
            // Try fetching real metrics (will likely be 0 if RLS blocks)
            try {
                const startStr = startDate.toISOString().split('T')[0];
                const endStr = endDate.toISOString().split('T')[0];

                const { count } = await supabase
                    .from('marketing_leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('client_id', report.client_id)
                    .gte('first_interaction_at', startStr)
                    .lte('first_interaction_at', endStr + 'T23:59:59');
                leadsCount = count || 0;

                const { data: manualData } = await supabase
                    .from('marketing_daily_performance')
                    .select('investment')
                    .eq('client_id', report.client_id)
                    .gte('date', startStr)
                    .lte('date', endStr);
                investment = manualData?.reduce((sum, d) => sum + (d.investment || 0), 0) || 0;
            } catch (e) { }
        }

        console.log(`> Leads: ${leadsCount}`);
        console.log(`> Investment: ${investment}`);

        const cpl = leadsCount ? investment / leadsCount : 0;
        const roas = 5.2; // Mock for this test

        // Logic: Variable Replacement
        let content = report.template;
        content = content.replace('{{client_nome}}', report.client.name);

        const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
        const formatNum = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

        content = content.replace('{{leads}}', formatNum(leadsCount));
        content = content.replace('{{spend}}', formatCurrency(investment));
        content = content.replace('{{cpl}}', formatCurrency(cpl));
        content = content.replace('{{roas}}', roas.toFixed(2) + 'x');

        console.log(`\n📄 Generated Content Preview:\n---\n"${content}"\n---`);

        console.log(`\n📦 Payload to n8n (JSON):`);
        console.log(JSON.stringify({
            source: 'paralello_automation',
            type: 'report',
            payload: {
                report_id: report.id,
                client_name: report.client.name,
                target_number: report.client.whatsapp_group_id || report.client.whatsapp,
                content: content,
                metrics: { leads: leadsCount, investment, cpl, roas },
                period: periodText
            }
        }, null, 2));
    }
}

runTest();
