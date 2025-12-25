const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STORAGE_STATE_PATH = path.join(__dirname, 'storage_state.json');

// Use a consistent User Agent or the same pool
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

async function handleHeadful(req, res) {
    const url = req.body.url || req.query.url || 'https://www.google.com';

    // We stick to the first UA in the list for headful mode to ensure consistency
    const selectedUA = userAgents[0];

    console.log(`Opening headful browser for: ${url}`);

    let browser;
    try {
        browser = await chromium.launch({
            headless: false,
            channel: 'chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const contextOptions = {
            viewport: { width: 1280, height: 720 },
            userAgent: selectedUA,
            locale: 'en-US',
            timezoneId: 'America/New_York'
        };

        if (fs.existsSync(STORAGE_STATE_PATH)) {
            console.log('Loading existing storage state...');
            contextOptions.storageState = STORAGE_STATE_PATH;
        }

        const context = await browser.newContext(contextOptions);
        const page = await context.newPage();

        await page.goto(url);

        console.log('Browser is open. Please log in manually.');
        console.log('IMPORTANT: Close the page/tab or wait for saves.');

        // Function to save state
        const saveState = async () => {
            try {
                await context.storageState({ path: STORAGE_STATE_PATH });
                console.log('Storage state saved successfully.');
            } catch (e) {
                // If context is closed, this will fail, which is expected during shutdown
            }
        };

        // Auto-save every 10 seconds while the window is open
        const interval = setInterval(saveState, 10000);

        // Save when the page is closed
        page.on('close', async () => {
            clearInterval(interval);
            await saveState();
        });

        // Wait for the browser to disconnect (user closes the last window)
        await new Promise((resolve) => browser.on('disconnected', resolve));

        clearInterval(interval);

        // Final attempt to save if context is alive
        await saveState();

        res.json({
            message: 'Headful session closed. Cookies and storage state have been saved.',
            userAgentUsed: selectedUA,
            path: STORAGE_STATE_PATH
        });
    } catch (error) {
        console.error('Headful Error:', error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Failed to start headful session', details: error.message });
    }
}

module.exports = { handleHeadful };
