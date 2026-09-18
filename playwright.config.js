const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
    testDir: './tests/browser',
    use: { baseURL: 'http://127.0.0.1:8000', serviceWorkers: 'block' },
    webServer: { command: 'npm start', url: 'http://127.0.0.1:8000', reuseExistingServer: !process.env.CI },
});
