const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

// ── CORS: set headers on EVERY response, including errors ──
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// ── Workspace for temp files ──
const WORKSPACE = path.join(__dirname, 'bq_workspace');
if (!fs.existsSync(WORKSPACE)) fs.mkdirSync(WORKSPACE);

const upload = multer({ dest: WORKSPACE });

// ── Health check endpoint ──
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Main assessment endpoint ──
app.post('/assess', (req, res) => {
    // Run multer manually so we can catch its errors with CORS headers intact
    upload.any()(req, res, (multerErr) => {
        if (multerErr) {
            console.error('Multer error:', multerErr);
            return res.status(400).json({ error: 'File upload failed', details: multerErr.message });
        }

        const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;

        if (!uploadedFile || !req.body.modality) {
            return res.status(400).json({ error: "Requires 'file' and 'modality' fields" });
        }

        const { filename, originalname, path: filePath } = uploadedFile;
        const modality = req.body.modality.charAt(0).toUpperCase() + req.body.modality.slice(1);

        const outDir = path.join(WORKSPACE, `${filename}_out`);
        fs.mkdirSync(outDir, { recursive: true });

        console.log(`[ASSESS] Processing "${originalname}" as ${modality}...`);
        console.log(`[ASSESS] Input: ${filePath}`);
        console.log(`[ASSESS] Output dir: ${outDir}`);

        // Volume mount: map our Windows workspace into the container as /app_data
        // --entrypoint overrides the container's default /bin/bash
        const args = [
            'run', '--rm',
            '--entrypoint', 'python3',
            '-v', `${WORKSPACE}:/app_data`,
            'ghcr.io/open-source-biometric-quality-framework/bqcore-service:latest',
            '-m', 'openbq',
            '-M', modality,
            '-I', `/app_data/${filename}`,
            '-O', `/app_data/${filename}_out`
        ];

        console.log(`[ASSESS] docker ${args.join(' ')}`);

        let stderrChunks = '';
        let stdoutChunks = '';
        const docker = spawn('docker', args);

        docker.stdout.on('data', (d) => { stdoutChunks += d.toString(); });
        docker.stderr.on('data', (d) => { stderrChunks += d.toString(); });

        docker.on('error', (err) => {
            console.error('[ASSESS] Spawn error:', err);
            cleanup(filePath, outDir);
            return res.status(500).json({ error: 'Failed to start Docker process', details: err.message });
        });

        docker.on('close', (code) => {
            console.log(`[ASSESS] Docker exited with code ${code}`);
            if (stdoutChunks) console.log('[ASSESS] stdout:', stdoutChunks);
            if (stderrChunks) console.log('[ASSESS] stderr:', stderrChunks);

            if (code !== 0) {
                cleanup(filePath, outDir);
                return res.status(500).json({
                    error: 'OpenBQ container returned a non-zero exit code',
                    exitCode: code,
                    details: stderrChunks || stdoutChunks
                });
            }

            // Read results from the output directory
            try {
                const outputFiles = fs.existsSync(outDir) ? fs.readdirSync(outDir) : [];
                console.log('[ASSESS] Output files:', outputFiles);

                const csvFile = outputFiles.find(f => f.endsWith('.csv'));
                const jsonFile = outputFiles.find(f => f.endsWith('.json'));

                if (jsonFile) {
                    const raw = fs.readFileSync(path.join(outDir, jsonFile), 'utf-8');
                    const parsed = JSON.parse(raw);
                    cleanup(filePath, outDir);
                    return res.json({
                        score: parsed.score ?? parsed.quality ?? 0,
                        modality: modality,
                        metadata: parsed
                    });
                }

                if (csvFile) {
                    const raw = fs.readFileSync(path.join(outDir, csvFile), 'utf-8');
                    console.log('[ASSESS] CSV content (first 500 chars):', raw.substring(0, 500));
                    // Try to extract a numeric score from the CSV
                    const lines = raw.split('\n').filter(l => l.trim());
                    const headers = lines[0] ? lines[0].split(',') : [];
                    const values = lines[1] ? lines[1].split(',') : [];
                    const scoreIdx = headers.findIndex(h => /score|quality|nfiq/i.test(h));
                    const score = scoreIdx >= 0 ? parseFloat(values[scoreIdx]) : 0;

                    cleanup(filePath, outDir);
                    return res.json({
                        score: isNaN(score) ? 0 : score,
                        modality: modality,
                        filename: originalname,
                        metadata: { headers, row: values }
                    });
                }

                // No recognizable output files
                cleanup(filePath, outDir);
                return res.json({
                    score: 0,
                    modality: modality,
                    filename: originalname,
                    warnings: ['OpenBQ produced no JSON or CSV output. Output files: ' + outputFiles.join(', ')]
                });

            } catch (parseErr) {
                console.error('[ASSESS] Parse error:', parseErr);
                cleanup(filePath, outDir);
                return res.status(500).json({ error: 'Failed to parse output', details: parseErr.message });
            }
        });
    });
});

// ── Global error handler (with CORS headers!) ──
app.use((err, req, res, _next) => {
    console.error('[ERROR]', err);
    res.header('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

function cleanup(filePath, outDir) {
    try { fs.unlinkSync(filePath); } catch (_) {}
    try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (_) {}
}

app.listen(8081, () => {
    console.log('─────────────────────────────────────────');
    console.log('  Biometric Proxy listening on port 8081');
    console.log('─────────────────────────────────────────');
});
