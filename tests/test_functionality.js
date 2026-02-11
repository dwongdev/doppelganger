const fs = require('fs');
const path = require('path');

async function test() {
    const capturesDir = path.join(__dirname, 'test_captures');
    if (!fs.existsSync(capturesDir)) {
        fs.mkdirSync(capturesDir);
    }

    // Populate
    fs.writeFileSync(path.join(capturesDir, 'a.png'), 'a');
    fs.writeFileSync(path.join(capturesDir, 'b.jpg'), 'b');
    fs.writeFileSync(path.join(capturesDir, 'c.txt'), 'c'); // Should be ignored
    fs.writeFileSync(path.join(capturesDir, 'd.webm'), 'd');

    console.log('Testing /api/data/screenshots logic...');
    const entriesRaw = await fs.promises.readdir(capturesDir);
    const screenshots = (await Promise.all(
        entriesRaw
            .filter(name => /\.(png|jpg|jpeg)$/i.test(name))
            .map(async (name) => {
                const fullPath = path.join(capturesDir, name);
                try {
                    const stat = await fs.promises.stat(fullPath);
                    return {
                        name,
                        url: `/captures/${name}`,
                        size: stat.size,
                        modified: stat.mtimeMs
                    };
                } catch {
                    return null;
                }
            })
    ))
    .filter(Boolean)
    .sort((a, b) => b.modified - a.modified);

    console.log('Screenshots:', screenshots.length);
    if (screenshots.length !== 2) throw new Error('Expected 2 screenshots');
    if (screenshots.some(s => s.name === 'c.txt' || s.name === 'd.webm')) throw new Error('Incorrect filtering');

    console.log('Testing /api/data/captures logic...');
    const captures = (await Promise.all(
        entriesRaw
            .filter(name => /\.(png|jpg|jpeg|webm)$/i.test(name))
            .map(async (name) => {
                const fullPath = path.join(capturesDir, name);
                try {
                    const stat = await fs.promises.stat(fullPath);
                    const lower = name.toLowerCase();
                    const type = lower.endsWith('.webm') ? 'recording' : 'screenshot';
                    return {
                        name,
                        url: `/captures/${name}`,
                        size: stat.size,
                        modified: stat.mtimeMs,
                        type
                    };
                } catch {
                    return null;
                }
            })
    ))
    .filter(Boolean)
    .sort((a, b) => b.modified - a.modified);

    console.log('Captures:', captures.length);
    if (captures.length !== 3) throw new Error('Expected 3 captures');
    const webm = captures.find(c => c.name === 'd.webm');
    if (!webm || webm.type !== 'recording') throw new Error('Webm type should be recording');

    console.log('Testing /api/clear-screenshots logic...');
    const entriesToClear = await fs.promises.readdir(capturesDir);
    await Promise.all(entriesToClear.map(async (entry) => {
        const entryPath = path.join(capturesDir, entry);
        try {
            const stat = await fs.promises.stat(entryPath);
            if (stat.isFile()) {
                await fs.promises.unlink(entryPath);
            }
        } catch (e) {}
    }));

    const remaining = await fs.promises.readdir(capturesDir);
    console.log('Remaining files:', remaining.length);
    if (remaining.length !== 0) throw new Error('Expected 0 remaining files');

    console.log('All tests passed!');

    // Cleanup
    fs.rmdirSync(capturesDir);
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
