const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STORAGE_STATE_PATH = path.join(__dirname, 'storage_state.json');

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

async function handleScrape(req, res) {
    const url = req.body.url || req.query.url;
    const customHeaders = req.body.headers || {};
    const userSelector = req.body.selector || req.query.selector;
    const waitInput = req.body.wait || req.query.wait;
    const waitTime = waitInput ? parseFloat(waitInput) * 1000 : 2000;
    const rotateUserAgents = req.body.rotateUserAgents || req.query.rotateUserAgents || false;

    if (!url) {
        return res.status(400).json({ error: 'URL is required.' });
    }

    console.log(`Scraping: ${url}`);

    // Pick a random UA if rotation is enabled, otherwise use the first one
    const selectedUA = rotateUserAgents
        ? userAgents[Math.floor(Math.random() * userAgents.length)]
        : userAgents[0];

    let browser;
    try {
        // Use 'chrome' channel to use a real installed browser instead of default Chromium
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
            extraHTTPHeaders: customHeaders,
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

        // Manual WebDriver Patch
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        const page = await context.newPage();

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Auto-scroll logic
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 400;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) { clearInterval(timer); resolve(); }
                }, 100);
            });
            window.scrollTo(0, 0);
        });

        await page.waitForTimeout(waitTime);

        let productHtml = '';
        let usedFallback = false;

        if (userSelector) {
            productHtml = await page.$$eval(userSelector, (elements) => {
                return elements.map(el => {
                    const useless = el.querySelectorAll('script, style, svg, link, noscript');
                    useless.forEach(node => node.remove());
                    return el.outerHTML;
                }).join('\n');
            });
            if (!productHtml || productHtml.trim() === '') usedFallback = true;
        } else {
            usedFallback = true;
        }

        if (usedFallback) {
            productHtml = await page.evaluate(() => {
                const body = document.body.cloneNode(true);
                const useless = body.querySelectorAll('script, style, svg, link, noscript');
                useless.forEach(node => node.remove());
                return body.innerHTML;
            });
        }

        // Ensure the public/screenshots directory exists
        const screenshotsDir = path.join(__dirname, 'public', 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        const screenshotName = `scrape_${Date.now()}.png`;
        const screenshotPath = path.join(screenshotsDir, screenshotName);
        try {
            await page.screenshot({ path: screenshotPath, fullPage: false });
        } catch (e) {
            console.error('Screenshot failed:', e.message);
        }

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

        const data = {
            title: await page.title(),
            url: page.url(),
            html: formatHTML(productHtml),
            is_partial: !usedFallback,
            selector_used: usedFallback ? (userSelector ? `${userSelector} (not found, using body)` : 'body (default)') : userSelector,
            links: await page.$$eval('a[href]', elements => {
                return elements.map(el => el.href).filter(href => href && href.startsWith('http'));
            }),
            screenshot_url: `/screenshots/${screenshotName}`
        };

        // Save session state
        await context.storageState({ path: STORAGE_STATE_PATH });

        await browser.close();
        res.json(data);
    } catch (error) {
        console.error('Scrape Error:', error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Failed to scrape', details: error.message });
    }
}

module.exports = { handleScrape };
