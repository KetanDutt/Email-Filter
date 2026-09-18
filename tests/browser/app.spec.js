const { test, expect } = require('@playwright/test');

test('setup, demo, search, selection, read action and sign-out', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('#authorize_button')).toBeDisabled();
    await expect(page.locator('#sync-status')).toContainText('Setup needed');
    await page.getByRole('button', { name: 'Explore demo' }).click();
    await expect(page.locator('#total-emails')).toHaveText('96');
    await page.locator('#select-all-groups').check();
    await expect(page.locator('#selection-summary')).toContainText('96 messages');
    page.on('dialog', dialog => dialog.accept());
    await page.locator('#mark-all-read').click();
    await expect(page.locator('#total-emails')).toHaveText('0');
    await page.locator('#filter-type').selectOption('all');
    await expect(page.locator('#total-emails')).toHaveText('148');
    await page.locator('#search-emails').fill('newsletter');
    await expect(page.locator('#emails-table-body tr')).toHaveCount(1);
    await page.locator('#signout_button').click();
    await expect(page.locator('#signin-prompt')).toBeVisible();
    expect(errors).toEqual([]);
});

async function mockGmail(page, { fail = false, slow = false } = {}) {
    await page.route('**/config.js', route => route.fulfill({
        contentType: 'text/javascript',
        body: 'window.EMAIL_FILTER_CONFIG = {clientId:"test",maxMessages:10000};'
    }));
    await page.route('https://accounts.google.com/gsi/client', route => route.fulfill({
        contentType: 'text/javascript',
        body: `window.google={accounts:{oauth2:{initTokenClient(options){return {requestAccessToken(){options.callback({access_token:'test',expires_in:3600})}}},hasGrantedAllScopes(){return true},revoke(token,callback){callback()}}}};`
    }));
    let lists = 0;
    let gets = 0;
    let changes = 0;
    await page.route('https://gmail.googleapis.com/**', async route => {
        const url = new URL(route.request().url());
        let body = {};
        if (url.pathname.endsWith('/labels')) {
            body = { labels: [{ id: 'Label_1', name: '<img src=x onerror=alert(1)>', type: 'user' }] };
        } else if (url.pathname.endsWith('/batchModify')) {
            changes++;
            if (fail) return route.fulfill({ status: 400, json: { error: { message: 'Test failure' } } });
        } else if (url.pathname.endsWith('/messages')) {
            lists++;
            body = url.searchParams.has('pageToken')
                ? { messages: [{ id: '2' }] }
                : { messages: [{ id: '1' }], nextPageToken: 'next' };
        } else {
            gets++;
            if (slow) await new Promise(resolve => setTimeout(resolve, 500));
            body = {
                id: url.pathname.split('/').pop(),
                labelIds: ['INBOX', 'UNREAD', 'CATEGORY_PERSONAL'],
                payload: { headers: [{ name: 'From', value: '<img src=x onerror=alert(1)>' }] }
            };
        }
        await route.fulfill({ json: body });
    });
    return { counts: () => ({ lists, gets, changes }) };
}

test('pagination, refresh deduplication, safe rendering and label dialog', async ({ page }) => {
    const mock = await mockGmail(page);
    await page.goto('/');
    await expect(page.locator('#authorize_button')).toBeEnabled();
    await page.locator('#authorize_button').click();
    await expect(page.locator('#sync-status')).toContainText('Sync complete');
    await expect(page.locator('#total-emails')).toHaveText('2');
    await expect(page.locator('#emails-table-body img')).toHaveCount(0);
    await page.locator('#refresh-button').click();
    await expect(page.locator('#sync-status')).toContainText('Sync complete');
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('#total-emails')).toHaveText('2');
    expect(mock.counts().lists).toBe(4);
    await page.getByRole('button', { name: 'Label', exact: true }).click();
    await expect(page.locator('#label-select option')).toHaveText('<img src=x onerror=alert(1)>');
    await expect(page.locator('#label-dialog img')).toHaveCount(0);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('mutation failure retains data and reports partial completion', async ({ page }) => {
    await mockGmail(page, { fail: true });
    await page.goto('/');
    await expect(page.locator('#authorize_button')).toBeEnabled();
    await page.locator('#authorize_button').click();
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('#total-emails')).toHaveText('2');
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(page.locator('#sync-status')).toContainText('0 of 2 confirmed updated');
    await expect(page.locator('#total-emails')).toHaveText('2');
});

test('cancellation ends the operation and prevents late updates', async ({ page }) => {
    await mockGmail(page, { slow: true });
    await page.goto('/');
    await expect(page.locator('#authorize_button')).toBeEnabled();
    await page.locator('#authorize_button').click();
    await expect(page.locator('#stop-sync-btn')).toBeVisible();
    await page.locator('#stop-sync-btn').click();
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('#sync-status')).toContainText('Sync stopped');
    await expect(page.locator('#total-emails')).toHaveText('0');
});

test('mobile demo stays within viewport and theme works', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('#demo-button').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.evaluate(() => document.documentElement.dataset.bsTheme = 'light');
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
});
