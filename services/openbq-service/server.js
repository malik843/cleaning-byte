const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 8080;

// Setup generic temp storage for incoming image buffers
const uploadDir = '/tmp/openbq-uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

// Docker Health Check
app.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

// Single Biometric Assessment Route
app.post('/assess', upload.single('image'), (req, res) => {
    const file = req.file;
    const modality = req.body.modality;

    if (!file || !modality) {
        if (file) fs.unlink(file.path, () => {});
        return res.status(400).json({ error: "Missing required 'image' file payload or 'modality' string." });
    }

    const tempFilePath = file.path;

    // Securely spawn the openbq python module natively via OS arguments array
    const openbq = spawn('openbq', ['-m', modality, '-i', tempFilePath, '--format', 'json']);

    let stdoutData = '';
    let stderrData = '';

    openbq.stdout.on('data', (chunk) => stdoutData += chunk.toString());
    openbq.stderr.on('data', (chunk) => stderrData += chunk.toString());

    openbq.on('close', (code) => {
        // Cleanup the temp file aggressively
        fs.unlink(tempFilePath, (err) => {
            if (err) console.error("Failed to aggressively clean temp file:", err);
        });

        if (code !== 0) {
            return res.status(500).json({ error: `Process existed with code ${code}`, stderr: stderrData });
        }

        try {
            const parsed = JSON.parse(stdoutData.trim());
            return res.status(200).json(parsed);
        } catch (err) {
            return res.status(500).json({ error: "Failed to parse openbq output", stderr: stderrData });
        }
    });

    openbq.on('error', (err) => {
        fs.unlink(tempFilePath, () => {});
        return res.status(500).json({ error: "Failed to spawn openbq OS process", details: err.message });
    });
});

app.listen(port, () => {
    console.log(`OpenBQ Blackbox Microservice securely listening on local port ${port}`);
});
