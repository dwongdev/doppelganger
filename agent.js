const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STORAGE_STATE_PATH = path.join(__dirname, 'storage_state.json');

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

async function moveMouseHumanlike(page, targetX, targetY) {
    const steps = 6 + Math.floor(Math.random() * 4);
    for (let i = 1; i <= steps; i++) {
        const jitterX = (Math.random() - 0.5) * 3;
        const jitterY = (Math.random() - 0.5) * 3;
        await page.mouse.move(targetX + jitterX, targetY + jitterY, { steps: 1 });
    }
}

async function idleMouse(page) {
    // Perform 2-3 random drifting movements
    const drifts = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < drifts; i++) {
        const viewport = page.viewportSize() || { width: 1280, height: 720 };
        const x = Math.random() * viewport.width;
        const y = Math.random() * viewport.height;
        await page.mouse.move(x, y, { steps: 25 }); // Slow drift
        await page.waitForTimeout(500 + Math.random() * 1000);
    }
}

async function overshootScroll(page, targetY) {
    const overshoot = (Math.random() > 0.5 ? 1 : -1) * (30 + Math.floor(Math.random() * 50));
    const smoothTarget = targetY + overshoot;

    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), smoothTarget);
    await page.waitForTimeout(400 + Math.random() * 400);

    // Correct back to target
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), targetY);
}

async function humanType(page, selector, text) {
    await page.focus(selector);
    const chars = text.split('');

    for (const char of chars) {
        // 5% chance of a typo
        if (Math.random() < 0.05) {
            const keys = 'qwertyuiopasdfghjklzxcvbnm';
            const typo = keys[Math.floor(Math.random() * keys.length)];
            await page.keyboard.press(typo, { delay: 50 + Math.random() * 100 });
            await page.waitForTimeout(200 + Math.random() * 300);
            await page.keyboard.press('Backspace', { delay: 50 + Math.random() * 100 });
            await page.waitForTimeout(100 + Math.random() * 200);
        }
        await page.keyboard.press(char, { delay: 50 + Math.random() * 150 });
    }
}

async function handleAgent(req, res) {
    const data = (req.method === 'POST') ? req.body : req.query;
    let { url, actions, wait: globalWait, rotateUserAgents, humanTyping, stealth = {} } = data;
    const {
        allowTypos = false,
        idleMovements = false,
        overscroll = false,
        deadClicks = false,
        fatigue = false
    } = stealth;

    if (typeof actions === 'string') {
        try {
            actions = JSON.parse(actions);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid actions JSON format.' });
        }
    }

    if (!actions || !Array.isArray(actions)) {
        return res.status(400).json({
            error: 'Actions array is required.',
            usage: 'POST JSON with {"actions": [...], "stealth": {...}}'
        });
    }

    // Pick a random UA if rotation is enabled, otherwise use the first one
    const selectedUA = rotateUserAgents
        ? userAgents[Math.floor(Math.random() * userAgents.length)]
        : userAgents[0];

    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            channel: 'chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--hide-scrollbars',
                '--mute-audio'
            ]
        });

        const contextOptions = {
            userAgent: selectedUA,
            viewport: { width: 1280 + Math.floor(Math.random() * 640), height: 720 + Math.floor(Math.random() * 360) },
            deviceScaleFactor: 1,
            locale: 'en-US',
            timezoneId: 'America/New_York',
            colorScheme: 'dark',
            permissions: ['geolocation']
        };

        if (fs.existsSync(STORAGE_STATE_PATH)) {
            contextOptions.storageState = STORAGE_STATE_PATH;
        }

        const context = await browser.newContext(contextOptions);

        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        const page = await context.newPage();

        if (url) {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }

        const logs = [];
        let actionIdx = 0;

        for (const act of actions) {
            actionIdx++;
            const { type, selector, value, key, timeout } = act;
            const actionTimeout = timeout || 10000;

            // Fatigue logic: increase delays slightly as more actions are performed
            const fatigueMultiplier = fatigue ? 1 + (actionIdx * 0.1) : 1;
            const baseDelay = (ms) => (ms + Math.random() * 100) * fatigueMultiplier;

            try {
                switch (type) {
                    case 'navigate':
                    case 'goto':
                        logs.push(`Navigating to: ${value}`);
                        await page.goto(value, { waitUntil: 'domcontentloaded' });
                        break;
                    case 'click':
                        logs.push(`Clicking: ${selector}`);
                        await page.waitForSelector(selector, { timeout: actionTimeout });

                        // Neutral Dead Click
                        if (deadClicks && Math.random() < 0.3) {
                            logs.push('Performing neutral dead-click...');
                            await page.mouse.click(10 + Math.random() * 50, 10 + Math.random() * 50);
                            await page.waitForTimeout(baseDelay(200));
                        }

                        // Get element point for human-like movement
                        const handle = await page.$(selector);
                        const box = await handle.boundingBox();
                        if (box) {
                            const centerX = box.x + box.width / 2 + (Math.random() - 0.5) * 5;
                            const centerY = box.y + box.height / 2 + (Math.random() - 0.5) * 5;
                            await moveMouseHumanlike(page, centerX, centerY);
                        }

                        await page.waitForTimeout(baseDelay(50));
                        await page.click(selector, {
                            delay: baseDelay(50)
                        });
                        break;
                    case 'type':
                    case 'fill':
                        logs.push(`Typing into ${selector}: ${value}`);
                        await page.waitForSelector(selector, { timeout: actionTimeout });

                        if (humanTyping) {
                            if (allowTypos) {
                                await humanType(page, selector, value);
                            } else {
                                await page.type(selector, value, {
                                    delay: baseDelay(50)
                                });
                            }
                        } else {
                            await page.fill(selector, value);
                        }
                        break;
                    case 'press':
                        logs.push(`Pressing key: ${key}`);
                        await page.keyboard.press(key, { delay: baseDelay(50) });
                        break;
                    case 'wait':
                        const ms = value ? parseFloat(value) * 1000 : 2000;
                        logs.push(`Waiting: ${ms}ms`);

                        if (idleMovements) {
                            logs.push('Simulating cursor restlessness...');
                            await Promise.race([
                                idleMouse(page),
                                page.waitForTimeout(ms)
                            ]);
                        } else {
                            await page.waitForTimeout(ms);
                        }
                        break;
                    case 'select':
                        logs.push(`Selecting ${value} from ${selector}`);
                        await page.waitForSelector(selector, { timeout: actionTimeout });
                        await page.selectOption(selector, value);
                        break;
                    case 'scroll':
                        logs.push('Scrolling page...');
                        const scrollAmount = 400 + Math.random() * 400;
                        if (overscroll) {
                            await overshootScroll(page, scrollAmount);
                        } else {
                            await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), scrollAmount);
                        }
                        await page.waitForTimeout(baseDelay(500));
                        break;
                }
            } catch (err) {
                logs.push(`FAILED action ${type}: ${err.message}`);
            }
        }

        if (globalWait) await page.waitForTimeout(parseFloat(globalWait) * 1000);
        await page.waitForTimeout(baseDelay(500));

        const cleanedHtml = await page.evaluate(() => {
            const clone = document.documentElement.cloneNode(true);
            const useless = clone.querySelectorAll('script, style, svg, link, noscript');
            useless.forEach(node => node.remove());
            return clone.outerHTML;
        });

        // Simple HTML Formatter
        const formatHTML = (html) => {
            let indent = 0;
            return html.replace(/<(\/?)([a-z0-9]+)([^>]*?)(\/?)>/gi, (match, slash, tag, attrs, selfClose) => {
                if (slash) indent--;
                const result = '  '.repeat(Math.max(0, indent)) + match;
                if (!slash && !selfClose && !['img', 'br', 'hr', 'input', 'link', 'meta'].includes(tag.toLowerCase())) indent++;
                return '\n' + result;
            }).trim();
        };

        // Ensure the public/screenshots directory exists
        const screenshotsDir = path.join(__dirname, 'public', 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        const screenshotName = `agent_${Date.now()}.png`;
        const screenshotPath = path.join(screenshotsDir, screenshotName);
        try {
            await page.screenshot({ path: screenshotPath, fullPage: false });
        } catch (e) {
            console.error('Agent Screenshot failed:', e.message);
        }

        const outputData = {
            final_url: page.url(),
            logs: logs,
            html: formatHTML(cleanedHtml),
            screenshot_url: `/screenshots/${screenshotName}`
        };

        await context.storageState({ path: STORAGE_STATE_PATH });
        await browser.close();
        res.json(outputData);
    } catch (error) {
        console.error('Agent Error:', error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Agent failed', details: error.message });
    }
}

module.exports = { handleAgent };
