/* Shared, dependency-free helpers. Never interpret mailbox content as HTML. */
(function (root) {
    'use strict';

    const categories = {
        CATEGORY_PERSONAL: 'primary',
        CATEGORY_PROMOTIONS: 'promotions',
        CATEGORY_SOCIAL: 'social',
        CATEGORY_UPDATES: 'updates',
        CATEGORY_FORUMS: 'forums'
    };

    const demoSenders = [
        'newsletter@designweekly.example',
        'offers@shop.example',
        'team@workspace.example',
        'updates@travel.example',
        'hello@community.example',
        'receipts@store.example'
    ];

    function queryFor(filter, category) {
        return [
            'in:inbox',
            { unread: 'is:unread', read: 'is:read', starred: 'is:starred' }[filter],
            categories[category] && `category:${categories[category]}`
        ].filter(Boolean).join(' ');
    }

    function normalize(message) {
        const from = message.payload?.headers?.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown sender';
        const sender = (from.match(/<([^<>]+)>/)?.[1] || from).trim().toLowerCase();
        return { id: message.id, sender, labels: message.labelIds || [] };
    }

    function matches(message, filter, category) {
        if (!message.labels.includes('INBOX') || message.labels.includes('TRASH')) return false;
        if (category !== 'ALL' && !message.labels.includes(category)) return false;
        if (filter === 'unread') return message.labels.includes('UNREAD');
        if (filter === 'read') return !message.labels.includes('UNREAD');
        if (filter === 'starred') return message.labels.includes('STARRED');
        return true;
    }

    function filterMessages(messages, filter, category) {
        return new Map([...messages].filter(([, message]) => matches(message, filter, category)));
    }

    function groupMessages(messages) {
        const groups = new Map();
        for (const message of messages.values()) {
            if (!groups.has(message.sender)) {
                groups.set(message.sender, { sender: message.sender, ids: [], unread: 0 });
            }
            const group = groups.get(message.sender);
            group.ids.push(message.id);
            if (message.labels.includes('UNREAD')) group.unread++;
        }
        return [...groups.values()];
    }

    function sortGroups(groups, field, direction) {
        return [...groups].sort((a, b) => {
            const comparison = field === 'sender'
                ? a.sender.localeCompare(b.sender)
                : a.ids.length - b.ids.length;
            return direction * comparison || a.sender.localeCompare(b.sender);
        });
    }

    function chunks(items, size) {
        if (!Number.isInteger(size) || size < 1) throw new RangeError('Chunk size must be a positive integer');
        const result = [];
        for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
        return result;
    }

    function retryable(status, error) {
        return status === 429
            || status >= 500
            || (status === 403 && (error?.errors || []).some(e => ['rateLimitExceeded', 'userRateLimitExceeded', 'backendError'].includes(e.reason)));
    }

    function retryDelayMs(attempt, retryAfter, now = Date.now(), jitter = 0) {
        let headerMs = 0;
        if (retryAfter) {
            const seconds = Number(retryAfter);
            headerMs = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - now;
            if (!Number.isFinite(headerMs) || headerMs < 0) headerMs = 0;
        }
        return Math.min(60000, Math.max(headerMs, 1000 * (2 ** attempt) + jitter));
    }

    function parseBody(text) {
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch {
            return { error: { message: String(text).replace(/\s+/g, ' ').slice(0, 180) } };
        }
    }

    function applyChange(messages, ids, change) {
        for (const id of ids) {
            const message = messages.get(id);
            if (!message) continue;
            message.labels = [...new Set([
                ...message.labels.filter(label => !(change.removeLabelIds || []).includes(label)),
                ...(change.addLabelIds || [])
            ])];
        }
    }

    function csvCell(value) {
        return `"${String(value).replaceAll('"', '""')}"`;
    }

    function toCsv(groups) {
        return [
            'sender,count,unread',
            ...groups.map(group => [group.sender, group.ids.length, group.unread].map(csvCell).join(','))
        ].join('\n');
    }

    function demoMailbox(count = 148) {
        const messages = new Map();
        for (let i = 0; i < count; i++) {
            const senderIndex = i % demoSenders.length;
            const wave = Math.floor(i / demoSenders.length);
            messages.set(`demo-${i}`, {
                id: `demo-${i}`,
                sender: demoSenders[senderIndex],
                labels: [
                    'INBOX',
                    'CATEGORY_PERSONAL',
                    ...(wave % 3 ? ['UNREAD'] : []),
                    ...(wave % 7 === 0 ? ['STARRED'] : [])
                ]
            });
        }
        return messages;
    }

    function messageLimit(value, fallback = 10000) {
        const limit = Number(value);
        return Number.isInteger(limit) && limit > 0 ? limit : fallback;
    }

    const api = {
        queryFor,
        normalize,
        matches,
        filterMessages,
        groupMessages,
        sortGroups,
        chunks,
        retryable,
        retryDelayMs,
        parseBody,
        applyChange,
        toCsv,
        demoMailbox,
        messageLimit,
        demoSenders
    };

    root.MailCore = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
