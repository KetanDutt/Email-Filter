const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('index.html exposes every element the UI script binds', () => {
    const required = [
        'sync-status', 'app-shell', 'signin-prompt', 'authorize_button', 'authorize_button_prompt',
        'signout_button', 'demo-button', 'loading', 'stop-sync-btn', 'loading-text', 'filter-type',
        'total-emails', 'unread-emails', 'senders-count', 'search-emails', 'emails-table-body',
        'empty-state', 'pagination-bar', 'page-info', 'previous-page', 'next-page', 'selection-summary',
        'mark-all-read', 'archive-all', 'delete-all', 'select-matching', 'export-csv', 'select-all-groups',
        'label-dialog', 'label-select', 'refresh-button', 'theme-toggle', 'categoryTab', 'main'
    ];
    for (const id of required) {
        assert.match(html, new RegExp(`id="${id}"`), `missing #${id}`);
    }
});

test('index.html does not load remote scripts or styles besides GIS (injected later)', () => {
    assert.equal(html.includes('cdn.'), false);
    assert.equal(html.includes('sweetalert'), false);
    assert.equal(html.includes('apis.google.com/js/api.js'), false);
    assert.match(html, /src="config\.js"/);
    assert.match(html, /src="core\.js"/);
    assert.match(html, /src="app\.js"/);
});

test('vendored CSS and icon fonts are present', () => {
    assert.equal(fs.existsSync(path.join(root, 'vendor/bootstrap.min.css')), true);
    assert.equal(fs.existsSync(path.join(root, 'vendor/bootstrap-icons/fonts/bootstrap-icons.woff2')), true);
});
