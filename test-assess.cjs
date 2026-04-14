const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a fake test image
const testFile = path.join(__dirname, 'test_finger.jpg');
fs.writeFileSync(testFile, Buffer.alloc(100, 0xFF));

const boundary = '----TestBoundary123';
const modality = 'fingerprint';
const fileData = fs.readFileSync(testFile);

const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    fileData,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="modality"\r\n\r\n${modality}\r\n--${boundary}--\r\n`)
]);

const options = {
    hostname: 'localhost',
    port: 8081,
    path: '/assess',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
    }
};

console.log('Sending test request to http://localhost:8081/assess...');

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log(`\nStatus: ${res.statusCode}`);
        console.log('Response:', data);
        fs.unlinkSync(testFile);
    });
});

req.on('error', (e) => {
    console.error('Connection error:', e.message);
});

req.write(body);
req.end();
