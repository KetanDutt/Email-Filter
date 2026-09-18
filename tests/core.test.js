const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core');

test('queries consistently scope all filters and categories to inbox', () => {
    assert.equal(core.queryFor('unread', 'CATEGORY_PERSONAL'), 'in:inbox is:unread category:primary');
    assert.equal(core.queryFor('all', 'ALL'), 'in:inbox');
    assert.equal(core.queryFor('starred', 'CATEGORY_FORUMS'), 'in:inbox is:starred category:forums');
    assert.equal(core.queryFor('read', 'CATEGORY_PROMOTIONS'), 'in:inbox is:read category:promotions');
});

test('normalization tolerates missing and case-insensitive headers', () => {
    assert.deepEqual(core.normalize({ id: '1' }), { id: '1', sender: 'unknown sender', labels: [] });
    assert.equal(core.normalize({ payload: { headers: [{ name: 'fRoM', value: 'Name <User@Example.com>' }] } }).sender, 'user@example.com');
    assert.equal(core.normalize({ payload: { headers: [{ name: 'From', value: 'plain@example.com' }] } }).sender, 'plain@example.com');
});

test('HTML-looking From values stay plain text after normalize', () => {
    const sender = core.normalize({
        id: 'xss',
        payload: { headers: [{ name: 'From', value: '<img src=x onerror=alert(1)>' }] }
    }).sender;
    assert.equal(sender, 'img src=x onerror=alert(1)');
    assert.equal(sender.includes('<'), false);
});

test('Map deduplicates IDs and grouping counts unread', () => {
    const messages = new Map();
    for (const id of ['1', '2', '1']) messages.set(id, { id, sender: 'sender', labels: id === '1' ? ['UNREAD'] : [] });
    assert.deepEqual(core.groupMessages(messages), [{ sender: 'sender', ids: ['1', '2'], unread: 1 }]);
});

test('client filters drop trash and honor category plus read state', () => {
    const messages = new Map([
        ['1', { id: '1', sender: 'a', labels: ['INBOX', 'UNREAD', 'CATEGORY_PERSONAL'] }],
        ['2', { id: '2', sender: 'b', labels: ['INBOX', 'CATEGORY_PERSONAL'] }],
        ['3', { id: '3', sender: 'c', labels: ['INBOX', 'TRASH', 'UNREAD', 'CATEGORY_PERSONAL'] }],
        ['4', { id: '4', sender: 'd', labels: ['INBOX', 'UNREAD', 'CATEGORY_PROMOTIONS'] }],
        ['5', { id: '5', sender: 'e', labels: ['INBOX', 'STARRED', 'CATEGORY_PERSONAL'] }]
    ]);
    assert.deepEqual([...core.filterMessages(messages, 'unread', 'CATEGORY_PERSONAL').keys()], ['1']);
    assert.deepEqual([...core.filterMessages(messages, 'read', 'CATEGORY_PERSONAL').keys()], ['2', '5']);
    assert.deepEqual([...core.filterMessages(messages, 'starred', 'ALL').keys()], ['5']);
    assert.equal(core.filterMessages(messages, 'all', 'ALL').size, 4);
});

test('sort is stable by sender after count', () => {
    const groups = [
        { sender: 'b@example.com', ids: [1, 2] },
        { sender: 'a@example.com', ids: [3, 4] },
        { sender: 'c@example.com', ids: [5] }
    ];
    assert.deepEqual(core.sortGroups(groups, 'count', -1).map(g => g.sender), ['a@example.com', 'b@example.com', 'c@example.com']);
    assert.deepEqual(core.sortGroups(groups, 'sender', 1).map(g => g.sender), ['a@example.com', 'b@example.com', 'c@example.com']);
});

test('Gmail mutations chunk at 1000 and reject invalid sizes', () => {
    assert.deepEqual(core.chunks(Array(2001).fill('x'), 1000).map(c => c.length), [1000, 1000, 1]);
    assert.throws(() => core.chunks([], 0), RangeError);
    assert.deepEqual(core.chunks([], 10), []);
});

test('retry transient errors, not permissions or expired sessions', () => {
    assert.equal(core.retryable(403, { errors: [{ reason: 'userRateLimitExceeded' }] }), true);
    assert.equal(core.retryable(403, { errors: [{ reason: 'rateLimitExceeded' }] }), true);
    for (const status of [429, 500, 503]) assert.equal(core.retryable(status), true);
    for (const status of [400, 401, 403, 404]) assert.equal(core.retryable(status), false);
});

test('retry delay honors Retry-After seconds, HTTP-date, and exponential backoff', () => {
    assert.equal(core.retryDelayMs(0, null, 0, 0), 1000);
    assert.equal(core.retryDelayMs(3, null, 0, 0), 8000);
    assert.equal(core.retryDelayMs(0, '2', 0, 0), 2000);
    assert.equal(core.retryDelayMs(0, 'not-a-date', 0, 0), 1000);
    const later = new Date(Date.UTC(2026, 0, 1, 0, 0, 5)).toUTCString();
    assert.equal(core.retryDelayMs(0, later, Date.UTC(2026, 0, 1, 0, 0, 0), 0), 5000);
    assert.equal(core.retryDelayMs(10, null, 0, 0), 60000);
});

test('parseBody never throws on empty or HTML error pages', () => {
    assert.deepEqual(core.parseBody(''), {});
    assert.deepEqual(core.parseBody('{"ok":true}'), { ok: true });
    assert.equal(core.parseBody('<html>nope</html>').error.message.includes('<html>'), true);
});

test('changes are idempotent and limited to confirmed IDs', () => {
    const messages = new Map([['1', { labels: ['INBOX', 'UNREAD'] }], ['2', { labels: ['INBOX'] }]]);
    const change = { addLabelIds: ['TRASH'], removeLabelIds: ['INBOX'] };
    core.applyChange(messages, ['1'], change);
    core.applyChange(messages, ['1'], change);
    assert.deepEqual(messages.get('1').labels, ['UNREAD', 'TRASH']);
    assert.deepEqual(messages.get('2').labels, ['INBOX']);
});

test('CSV export quotes senders so formulas and commas stay data', () => {
    const csv = core.toCsv([{ sender: '=1+1,"x"', ids: [1, 2], unread: 1 }]);
    assert.equal(csv, 'sender,count,unread\n"=1+1,""x""","2","1"');
});

test('message limit ignores invalid config and keeps a positive cap', () => {
    assert.equal(core.messageLimit(10000), 10000);
    assert.equal(core.messageLimit(0), 10000);
    assert.equal(core.messageLimit(-5), 10000);
    assert.equal(core.messageLimit('1000'), 1000);
    assert.equal(core.messageLimit('nope'), 10000);
    assert.equal(core.messageLimit(250), 250);
});
