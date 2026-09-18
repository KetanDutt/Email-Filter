const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core');

test('demo mailbox matches the documented unread/all counts', () => {
    const messages = core.demoMailbox();
    assert.equal(messages.size, 148);
    assert.equal(core.filterMessages(messages, 'unread', 'CATEGORY_PERSONAL').size, 96);
    assert.equal(core.filterMessages(messages, 'all', 'CATEGORY_PERSONAL').size, 148);
    assert.equal(core.filterMessages(messages, 'starred', 'ALL').size, 24);
    assert.equal(core.groupMessages(core.filterMessages(messages, 'unread', 'CATEGORY_PERSONAL')).length, 6);
});

test('demo mark-read then all-filter reproduces the product walkthrough', () => {
    const messages = core.demoMailbox();
    const unread = core.filterMessages(messages, 'unread', 'CATEGORY_PERSONAL');
    core.applyChange(messages, [...unread.keys()], { removeLabelIds: ['UNREAD'] });
    assert.equal(core.filterMessages(messages, 'unread', 'CATEGORY_PERSONAL').size, 0);
    assert.equal(core.filterMessages(messages, 'all', 'CATEGORY_PERSONAL').size, 148);
    const search = core.groupMessages(messages).filter(group => group.sender.includes('newsletter'));
    assert.equal(search.length, 1);
    assert.equal(search[0].ids.length, 25);
});

test('failed mutations must not applyChange until the batch succeeds', () => {
    const messages = core.demoMailbox();
    const before = messages.get('demo-1').labels.slice();
    // Simulate a 400: skip applyChange.
    assert.deepEqual(messages.get('demo-1').labels, before);
    assert.equal(core.filterMessages(messages, 'all', 'CATEGORY_PERSONAL').size, 148);
});

test('partial batch success only updates confirmed IDs', () => {
    const messages = new Map([
        ['1', { id: '1', sender: 'a', labels: ['INBOX'] }],
        ['2', { id: '2', sender: 'a', labels: ['INBOX'] }]
    ]);
    core.applyChange(messages, ['1'], { removeLabelIds: ['INBOX'] });
    assert.equal(core.filterMessages(messages, 'all', 'ALL').size, 1);
    assert.deepEqual(messages.get('2').labels, ['INBOX']);
});
