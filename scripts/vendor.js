// Reproduce checked-in browser assets using pinned, lockfile-verified packages.
const fs = require('node:fs');
const path = require('node:path');
for (const [from, to] of [
    ['bootstrap/dist/css/bootstrap.min.css', 'bootstrap.min.css'],
    ['bootstrap/LICENSE', 'BOOTSTRAP-LICENSE'],
    ['bootstrap-icons/LICENSE', 'BOOTSTRAP-ICONS-LICENSE'],
    ['bootstrap-icons/font/bootstrap-icons.min.css', 'bootstrap-icons/bootstrap-icons.min.css'],
    ['bootstrap-icons/font/fonts/bootstrap-icons.woff2', 'bootstrap-icons/fonts/bootstrap-icons.woff2'],
    ['bootstrap-icons/font/fonts/bootstrap-icons.woff', 'bootstrap-icons/fonts/bootstrap-icons.woff']
]) {
    fs.mkdirSync(path.dirname(`vendor/${to}`), { recursive: true });
    fs.copyFileSync(`node_modules/${from}`, `vendor/${to}`);
}
