const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const capturesDir = path.join(__dirname, 'benchmark_captures');

// Setup
if (!fs.existsSync(capturesDir)) {
    fs.mkdirSync(capturesDir);
}

const numFiles = 5000; // Increased
console.log(`Creating ${numFiles} dummy files...`);
for (let i = 0; i < numFiles; i++) {
    // Using a more realistic filename
    fs.writeFileSync(path.join(capturesDir, `screenshot_${i}_${Date.now()}.png`), 'dummy content');
}

async function benchmarkSync() {
    const start = performance.now();
    const entries = fs.readdirSync(capturesDir)
        .filter(name => /\.(png|jpg|jpeg)$/i.test(name))
        .map((name) => {
            const fullPath = path.join(capturesDir, name);
            const stat = fs.statSync(fullPath);
            return {
                name,
                url: `/captures/${name}`,
                size: stat.size,
                modified: stat.mtimeMs
            };
        })
        .sort((a, b) => b.modified - a.modified);
    const end = performance.now();
    return end - start;
}

async function benchmarkAsync() {
    const start = performance.now();
    const entriesRaw = await fs.promises.readdir(capturesDir);
    const filtered = entriesRaw.filter(name => /\.(png|jpg|jpeg)$/i.test(name));
    const entries = (await Promise.all(
        filtered.map(async (name) => {
                const fullPath = path.join(capturesDir, name);
                const stat = await fs.promises.stat(fullPath);
                return {
                    name,
                    url: `/captures/${name}`,
                    size: stat.size,
                    modified: stat.mtimeMs
                };
            })
    )).sort((a, b) => b.modified - a.modified);
    const end = performance.now();
    return end - start;
}

async function run() {
    console.log('Running benchmarks...');

    // Warmup
    await benchmarkSync();
    await benchmarkAsync();

    let totalSync = 0;
    let totalAsync = 0;
    const iterations = 5;

    for (let i = 0; i < iterations; i++) {
        console.log(`Iteration ${i+1}...`);
        totalSync += await benchmarkSync();
        totalAsync += await benchmarkAsync();
    }

    console.log(`Sync average: ${(totalSync / iterations).toFixed(2)}ms`);
    console.log(`Async average: ${(totalAsync / iterations).toFixed(2)}ms`);

    // Cleanup
    console.log('Cleaning up...');
    const files = fs.readdirSync(capturesDir);
    for (const file of files) {
        fs.unlinkSync(path.join(capturesDir, file));
    }
    fs.rmdirSync(capturesDir);
}

run().catch(console.error);
