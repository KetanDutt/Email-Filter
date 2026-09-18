/* Gmail Manager Pro — mailbox data and tokens stay in this tab only. */
'use strict';

const $ = id => document.getElementById(id);
const core = window.MailCore;
const config = window.EMAIL_FILTER_CONFIG || {};
const scope = 'https://www.googleapis.com/auth/gmail.modify';
const pageSize = 50;
const state = {
    messages: new Map(),
    labels: [],
    selected: new Set(),
    groups: [],
    page: 0,
    sort: 'count',
    direction: -1,
    category: 'CATEGORY_PERSONAL',
    busy: false,
    demo: false,
    token: null,
    expires: 0,
    controller: null,
    generation: 0
};
let tokenClient;

const pause = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Canceled', 'AbortError'));
    const abort = () => {
        clearTimeout(timer);
        reject(new DOMException('Canceled', 'AbortError'));
    };
    const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
});

function status(text, tone = 'info') {
    const banner = $('sync-status');
    banner.textContent = text;
    banner.dataset.tone = tone;
}

function signedIn(value) {
    $('app-shell').style.display = value ? '' : 'none';
    $('signin-prompt').style.display = value ? 'none' : '';
    $('authorize_button').style.display = value ? 'none' : '';
    $('signout_button').style.display = value ? '' : 'none';
}

function busy(value, cancelable = false) {
    state.busy = value;
    document.body.setAttribute('aria-busy', String(value));
    $('loading').style.display = value ? 'flex' : 'none';
    $('stop-sync-btn').style.display = cancelable ? '' : 'none';
    $('stop-sync-btn').disabled = false;
    $('loading-text').textContent = cancelable ? 'Syncing inbox metadata…' : 'Applying changes…';
    document.querySelectorAll('#controls input, #controls select, #categoryTab button, #refresh-button, #demo-button, #export-csv, #select-matching').forEach(el => {
        el.disabled = value;
    });
}

async function api(path, { method = 'GET', body, signal } = {}) {
    for (let attempt = 0; attempt < 5; attempt++) {
        if (!state.token || Date.now() >= state.expires) {
            const error = new Error('Your session expired. Sign out and sign in again to continue.');
            error.status = 401;
            throw error;
        }
        const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
            method,
            signal,
            headers: {
                Authorization: `Bearer ${state.token}`,
                ...(body ? { 'Content-Type': 'application/json' } : {})
            },
            ...(body ? { body: JSON.stringify(body) } : {})
        });
        const data = core.parseBody(await response.text());
        if (response.ok) return data;
        if (attempt < 4 && core.retryable(response.status, data.error)) {
            await pause(core.retryDelayMs(attempt, response.headers.get('Retry-After'), Date.now(), Math.random() * 500), signal);
            continue;
        }
        const error = new Error(
            response.status === 401
                ? 'Your session expired. Sign out and sign in again.'
                : `Gmail request failed (${response.status}). ${data.error?.message || 'Please try again.'}`
        );
        error.status = response.status;
        throw error;
    }
}

function render() {
    const messages = core.filterMessages(state.messages, $('filter-type').value, state.category);
    const groups = core.groupMessages(messages);
    $('total-emails').textContent = messages.size.toLocaleString();
    $('unread-emails').textContent = [...messages.values()].filter(message => message.labels.includes('UNREAD')).length.toLocaleString();
    $('senders-count').textContent = groups.length.toLocaleString();

    const search = $('search-emails').value.trim().toLowerCase();
    state.groups = core.sortGroups(
        groups.filter(group => group.sender.includes(search)),
        state.sort,
        state.direction
    );

    const valid = new Set(state.groups.map(group => group.sender));
    for (const sender of state.selected) {
        if (!valid.has(sender)) state.selected.delete(sender);
    }

    state.page = Math.min(state.page, Math.max(0, Math.ceil(state.groups.length / pageSize) - 1));
    const pageGroups = state.groups.slice(state.page * pageSize, (state.page + 1) * pageSize);
    const fragment = document.createDocumentFragment();

    for (const group of pageGroups) {
        const row = document.createElement('tr');
        const selectCell = row.insertCell();
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input group-checkbox';
        checkbox.checked = state.selected.has(group.sender);
        checkbox.setAttribute('aria-label', `Select ${group.sender}`);
        checkbox.onchange = () => {
            checkbox.checked ? state.selected.add(group.sender) : state.selected.delete(group.sender);
            updateSelection();
        };
        selectCell.append(checkbox);

        const sender = row.insertCell();
        sender.textContent = group.sender;
        sender.className = 'email-sender';
        sender.title = group.sender;

        const count = row.insertCell();
        count.innerHTML = '';
        const total = document.createElement('span');
        total.className = 'badge text-bg-primary rounded-pill';
        total.textContent = group.ids.length.toLocaleString();
        count.append(total);
        if (group.unread) {
            const unread = document.createElement('span');
            unread.className = 'badge text-bg-warning rounded-pill ms-1';
            unread.textContent = `${group.unread} unread`;
            count.append(unread);
        }

        const actions = row.insertCell();
        actions.className = 'action-buttons';
        for (const [action, label, danger] of [
            ['markRead', 'Mark read', false],
            ['archive', 'Archive', false],
            ['trash', 'Trash', true],
            ['label', 'Label', false]
        ]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `btn btn-sm ${danger ? 'btn-outline-danger' : 'btn-outline-primary'} action-btn`;
            button.textContent = label;
            button.onclick = () => mutate(action, group.ids);
            actions.append(button);
        }
        fragment.append(row);
    }

    $('emails-table-body').replaceChildren(fragment);
    $('empty-state').style.display = state.groups.length ? 'none' : '';
    $('pagination-bar').style.display = state.groups.length ? '' : 'none';
    $('page-info').textContent = state.groups.length
        ? `Senders ${state.page * pageSize + 1}–${Math.min((state.page + 1) * pageSize, state.groups.length)} of ${state.groups.length}`
        : 'No matching senders';
    $('previous-page').disabled = state.page === 0;
    $('next-page').disabled = (state.page + 1) * pageSize >= state.groups.length;
    document.querySelectorAll('th[data-sort]').forEach(th => {
        const active = th.dataset.sort === state.sort;
        th.setAttribute('aria-sort', active ? (state.direction === 1 ? 'ascending' : 'descending') : 'none');
        const icon = th.querySelector('i');
        if (icon) {
            icon.className = active
                ? `bi ${state.direction === 1 ? 'bi-arrow-up' : 'bi-arrow-down'} ms-1`
                : 'bi bi-arrow-down-up ms-1';
        }
    });
    updateSelection();
}

function updateSelection() {
    const selected = state.groups.filter(group => state.selected.has(group.sender));
    const count = selected.reduce((total, group) => total + group.ids.length, 0);
    $('selection-summary').textContent = `${selected.length} senders · ${count} messages selected`;
    for (const id of ['mark-all-read', 'archive-all', 'delete-all']) {
        $(id).disabled = !selected.length || state.busy;
    }
    $('select-matching').disabled = !state.groups.length || state.busy;
    $('export-csv').disabled = !state.groups.length || state.busy;
    const page = state.groups.slice(state.page * pageSize, (state.page + 1) * pageSize);
    const pageSelected = page.filter(group => state.selected.has(group.sender)).length;
    $('select-all-groups').checked = page.length > 0 && pageSelected === page.length;
    $('select-all-groups').indeterminate = pageSelected > 0 && pageSelected < page.length;
}

async function sync() {
    if (state.busy) return;
    if (state.demo) {
        state.selected.clear();
        render();
        status('Demo data only. No Google account is connected.');
        return;
    }
    if (!state.token) return;

    const generation = ++state.generation;
    const controller = new AbortController();
    state.controller = controller;
    state.messages.clear();
    state.selected.clear();
    state.page = 0;
    render();
    busy(true, true);

    let nextPageToken;
    let skipped = 0;
    let limited = false;
    const limit = core.messageLimit(config.maxMessages);

    try {
        state.labels = (await api('labels', { signal: controller.signal })).labels || [];
        do {
            const params = new URLSearchParams({
                maxResults: '500',
                q: core.queryFor($('filter-type').value, state.category),
                fields: 'messages/id,nextPageToken',
                includeSpamTrash: 'false',
                ...(nextPageToken ? { pageToken: nextPageToken } : {})
            });
            const page = await api(`messages?${params}`, { signal: controller.signal });
            const ids = page.messages || [];
            for (const chunk of core.chunks(ids, 24)) {
                const remaining = limit - state.messages.size;
                if (remaining <= 0) {
                    limited = true;
                    break;
                }
                const work = chunk.slice(0, remaining);
                for (const batch of core.chunks(work, 8)) {
                    await Promise.all(batch.map(async ({ id }) => {
                        try {
                            const message = await api(
                                `messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&fields=id,labelIds,payload/headers`,
                                { signal: controller.signal }
                            );
                            if (generation === state.generation && !controller.signal.aborted) {
                                state.messages.set(id, core.normalize(message));
                            }
                        } catch (error) {
                            if (error.status === 404) skipped++;
                            else throw error;
                        }
                    }));
                }
                $('loading-text').textContent = `Loaded ${state.messages.size.toLocaleString()} of up to ${limit.toLocaleString()} messages…`;
                render();
                if (work.length < chunk.length) {
                    limited = true;
                    break;
                }
                await pause(200, controller.signal);
            }
            nextPageToken = page.nextPageToken;
            if (state.messages.size >= limit && nextPageToken) limited = true;
        } while (nextPageToken && !limited);

        const extra = skipped ? `; ${skipped} disappeared during sync` : '';
        status(
            limited
                ? `Partial results: ${limit.toLocaleString()}-message safety limit reached. Narrow the filter. ${state.messages.size.toLocaleString()} messages loaded${extra}.`
                : `Sync complete. ${state.messages.size.toLocaleString()} messages loaded${extra}.`,
            limited ? 'warning' : 'info'
        );
    } catch (error) {
        controller.abort();
        if (generation === state.generation) {
            const stopped = error.name === 'AbortError';
            status(
                `${stopped ? 'Sync stopped.' : error.message} Partial results: ${state.messages.size.toLocaleString()} messages loaded. Refresh to retry.`,
                stopped ? 'warning' : 'danger'
            );
        }
    } finally {
        if (generation === state.generation) {
            state.controller = null;
            busy(false);
            render();
        }
    }
}

async function chooseLabel() {
    const labels = state.labels.filter(label => label.type === 'user');
    if (!labels.length) {
        window.alert('Create a custom label in Gmail, then refresh to load it here.');
        return null;
    }
    const dialog = $('label-dialog');
    const select = $('label-select');
    select.replaceChildren();
    for (const label of labels) {
        const option = document.createElement('option');
        option.value = label.id;
        option.textContent = label.name;
        select.append(option);
    }
    return new Promise(resolve => {
        dialog.addEventListener('close', () => resolve(dialog.returnValue === 'apply' ? select.value : null), { once: true });
        dialog.showModal();
        select.focus();
    });
}

async function mutate(action, ids) {
    if (state.busy) return;
    state.busy = true;
    let completed = 0;
    const uniqueIds = [...new Set(ids)];
    try {
        let change;
        if (action === 'label') {
            const label = await chooseLabel();
            if (!label) return;
            change = { addLabelIds: [label] };
        } else {
            change = {
                markRead: { removeLabelIds: ['UNREAD'] },
                archive: { removeLabelIds: ['INBOX'] },
                trash: { addLabelIds: ['TRASH'], removeLabelIds: ['INBOX'] }
            }[action];
        }
        if (!change || !uniqueIds.length) return;

        const description = { markRead: 'Mark as read', archive: 'Archive', trash: 'Move to Trash', label: 'Label' }[action];
        const warning = action === 'trash' ? '\nGmail normally permanently deletes Trash after 30 days.' : '';
        if (!window.confirm(`${state.demo ? 'DEMO: ' : ''}${description}: ${uniqueIds.length.toLocaleString()} loaded messages?\nOnly selected, loaded messages are affected.${warning}`)) {
            return;
        }

        busy(true);
        for (const batch of core.chunks(uniqueIds, 1000)) {
            if (!state.demo) {
                await api('messages/batchModify', { method: 'POST', body: { ids: batch, ...change } });
            }
            core.applyChange(state.messages, batch, change);
            completed += batch.length;
            $('loading-text').textContent = `Updated ${completed.toLocaleString()} of ${uniqueIds.length.toLocaleString()} messages…`;
            if (!state.demo) await pause(300);
        }
        state.selected.clear();
        status(`${state.demo ? 'Demo: ' : ''}${description} completed for ${completed.toLocaleString()} messages.`);
    } catch (error) {
        status(
            `Action incomplete: ${completed} of ${uniqueIds.length} confirmed updated. ${error.message} Refresh before retrying; the last request may have reached Gmail.`,
            'danger'
        );
    } finally {
        busy(false);
        render();
    }
}

function signout() {
    if (state.busy) return;
    const token = state.token;
    state.generation++;
    state.controller?.abort();
    state.token = null;
    state.expires = 0;
    state.demo = false;
    state.messages.clear();
    state.labels = [];
    state.selected.clear();
    render();
    signedIn(false);
    status('Signed out. Session data cleared.');
    if (token && window.google?.accounts?.oauth2?.revoke) {
        google.accounts.oauth2.revoke(token, () => {});
    }
}

function demo() {
    if (state.busy) return;
    state.generation++;
    state.controller?.abort();
    state.demo = true;
    state.token = null;
    state.messages = core.demoMailbox();
    state.labels = [{ id: 'demo-label', name: 'Keep for later', type: 'user' }];
    state.selected.clear();
    state.page = 0;
    signedIn(true);
    render();
    status('Demo data only. Actions change this sample session, not a real inbox.');
}

function exportCsv() {
    if (!state.groups.length) return;
    const blob = new Blob([core.toCsv(state.groups)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gmail-senders.csv';
    link.click();
    URL.revokeObjectURL(url);
}

function initAuth() {
    if (!config.clientId) {
        status('Setup needed: add your public OAuth client ID in config.js. You can explore the demo now.', 'warning');
        return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onerror = () => status('Google sign-in could not load. Check your connection or content blocker and reload.', 'danger');
    script.onload = () => {
        try {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: config.clientId,
                scope,
                error_callback: () => status('Sign-in was closed or blocked. Please try again.', 'warning'),
                callback: response => {
                    if (response.error || !response.access_token) {
                        status('Sign-in failed. Please try again.', 'danger');
                        return;
                    }
                    if (!google.accounts.oauth2.hasGrantedAllScopes(response, scope)) {
                        google.accounts.oauth2.revoke(response.access_token, () => {});
                        status('Gmail modify permission is required. Sign in and grant access.', 'warning');
                        return;
                    }
                    state.token = response.access_token;
                    state.expires = Date.now() + Math.max(0, Number(response.expires_in || 3600) - 60) * 1000;
                    state.demo = false;
                    signedIn(true);
                    sync();
                }
            });
            for (const id of ['authorize_button', 'authorize_button_prompt']) $(id).disabled = false;
            status('Ready to connect. Your mailbox data stays in this browser session.');
        } catch {
            status('Unable to initialize Google sign-in. Check config.js and reload.', 'danger');
        }
    };
    document.head.append(script);
}

function setTheme(value) {
    document.documentElement.dataset.bsTheme = value;
    $('theme-toggle').innerHTML = value === 'dark'
        ? '<i class="bi bi-sun" aria-hidden="true"></i>'
        : '<i class="bi bi-moon" aria-hidden="true"></i>';
    $('theme-toggle').setAttribute('aria-label', `Switch to ${value === 'dark' ? 'light' : 'dark'} theme`);
}

function init() {
    signedIn(false);
    for (const id of ['authorize_button', 'authorize_button_prompt']) {
        $(id).disabled = true;
        $(id).onclick = () => tokenClient?.requestAccessToken({ prompt: '' });
    }
    $('signout_button').onclick = signout;
    $('demo-button').onclick = demo;
    $('refresh-button').onclick = sync;
    $('export-csv').onclick = exportCsv;
    $('select-matching').onclick = () => {
        for (const group of state.groups) state.selected.add(group.sender);
        render();
    };
    $('stop-sync-btn').onclick = () => {
        state.controller?.abort();
        $('stop-sync-btn').disabled = true;
    };
    $('filter-type').onchange = () => {
        state.page = 0;
        state.selected.clear();
        sync();
    };
    let searchTimer;
    $('search-emails').oninput = () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.page = 0;
            state.selected.clear();
            render();
        }, 150);
    };
    document.querySelectorAll('#categoryTab button').forEach(button => {
        button.setAttribute('aria-pressed', String(button.classList.contains('active')));
        button.onclick = () => {
            if (state.busy) return;
            document.querySelectorAll('#categoryTab button').forEach(tab => {
                tab.classList.toggle('active', tab === button);
                tab.setAttribute('aria-pressed', String(tab === button));
            });
            state.category = button.dataset.category;
            state.selected.clear();
            state.page = 0;
            sync();
        };
    });
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.tabIndex = 0;
        const sort = () => {
            state.direction = state.sort === th.dataset.sort ? -state.direction : -1;
            state.sort = th.dataset.sort;
            render();
        };
        th.onclick = sort;
        th.onkeydown = event => {
            if (['Enter', ' '].includes(event.key)) {
                event.preventDefault();
                sort();
            }
        };
    });
    $('select-all-groups').onchange = event => {
        for (const group of state.groups.slice(state.page * pageSize, (state.page + 1) * pageSize)) {
            event.target.checked ? state.selected.add(group.sender) : state.selected.delete(group.sender);
        }
        render();
    };
    for (const [id, action] of [['mark-all-read', 'markRead'], ['archive-all', 'archive'], ['delete-all', 'trash']]) {
        $(id).onclick = () => mutate(action, state.groups.filter(group => state.selected.has(group.sender)).flatMap(group => group.ids));
    }
    $('previous-page').onclick = () => {
        state.page--;
        render();
    };
    $('next-page').onclick = () => {
        state.page++;
        render();
    };

    let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    try { theme = localStorage.getItem('theme') || theme; } catch { /* Storage can be blocked. */ }
    setTheme(theme);
    $('theme-toggle').onclick = () => {
        const value = document.documentElement.dataset.bsTheme === 'dark' ? 'light' : 'dark';
        setTheme(value);
        try { localStorage.setItem('theme', value); } catch { /* Non-essential preference. */ }
    };

    window.addEventListener('beforeunload', event => {
        if (state.busy) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
    window.addEventListener('offline', () => status('You are offline. Gmail actions require a connection; loaded data is session-only.', 'warning'));
    window.addEventListener('online', () => status('Back online. Refresh if a sync or action was interrupted.'));
    window.addEventListener('keydown', event => {
        if (event.key === '/' && event.target === document.body) {
            event.preventDefault();
            $('search-emails').focus();
        }
    });

    render();
    initAuth();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => { /* Optional shell caching. */ });
    }
}

init();
