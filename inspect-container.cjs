const { spawn } = require('child_process');

const docker = spawn('docker', [
    'run', '--rm', '--entrypoint', '/bin/sh',
    'ghcr.io/open-source-biometric-quality-framework/bqcore-service:latest',
    '-c', 'python3 -m openbq --help 2>&1; echo "EXIT:$?"'
]);

let out = '';
docker.stdout.on('data', d => out += d);
docker.stderr.on('data', d => out += d);
docker.on('close', () => console.log(out));
