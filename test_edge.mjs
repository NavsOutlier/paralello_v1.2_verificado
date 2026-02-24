async function testEdgeFunction() {
    const url = 'https://fhfamquilobeoibqfhwh.supabase.co/functions/v1/n8n-proxy';
    console.log(`Sending POST to ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: 'test_fake_code_from_meta',
                source: 'marketing_dashboard',
                timestamp: new Date().toISOString()
            })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log(`Raw Response:`, text);

    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

testEdgeFunction();
