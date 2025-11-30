const http = require('http');

const data = JSON.stringify({
    arguments: "John to review PR by Friday. Sarah will update the documentation.",
    user: {
        id: "12345",
        name: "Test User"
    }
});

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/cliq/command',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);

    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:');
        console.log(responseData);
        try {
            const json = JSON.parse(responseData);
            console.log('\n--- Parsed Response ---');
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Could not parse JSON');
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
