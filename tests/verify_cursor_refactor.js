const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

// Adjust path as the test is in tests/
const { installMouseHelper } = require('../src/agent/dom-utils');

async function run() {
    console.log('Verifying installMouseHelper export...');
    assert.strictEqual(typeof installMouseHelper, 'function', 'installMouseHelper should be a function');

    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext();

    console.log('Adding init script...');
    await context.addInitScript(installMouseHelper);

    const page = await context.newPage();
    console.log('Navigating to page...');
    await page.goto('data:text/html,<html><body>Hello</body></html>');

    // Wait a bit for DOMContentLoaded if needed
    await page.waitForTimeout(500);

    console.log('Verifying cursor injection...');
    const exists = await page.evaluate(() => {
        return !!document.getElementById('dg-cursor-overlay');
    });

    if (exists) {
        console.log('SUCCESS: Cursor overlay found.');
    } else {
        console.error('FAILURE: Cursor overlay NOT found.');
        process.exit(1);
    }

    await browser.close();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
