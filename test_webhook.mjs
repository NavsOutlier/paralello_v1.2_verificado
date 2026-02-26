import * as https from 'https';

const postData = JSON.stringify({
    client_id: "7204209c-946a-402e-a2c4-1b5ce979dea3",
    organization_id: "a8901c51-67e6-45f5-81fa-dbbedfd51e5a",
    ad_account_id: "act_665869127611895"
});

const options = {
    hostname: 'fhfamquilobeoibqfhwh.supabase.co',
    port: 443,
    path: '/functions/v1/trigger-meta-sync',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(postData);
req.end();
