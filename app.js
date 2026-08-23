        // Configuration - Updated with proper scopes
        });
                // Set up category tabs
                document.querySelectorAll('#categoryTab .nav-link').forEach(tab => {
                    tab.addEventListener('click', (e) => {
                        // Update active styling
                        document.querySelectorAll('#categoryTab .nav-link').forEach(t => {
                            t.classList.remove('active', 'text-light', 'border-bottom', 'border-primary', 'border-2');
                            t.classList.add('text-secondary');
                        });
                        e.currentTarget.classList.remove('text-secondary');
                        e.currentTarget.classList.add('active', 'text-light', 'border-bottom', 'border-primary', 'border-2');
                        
                        // Update state and reload
                        state.currentCategory = e.currentTarget.dataset.category;
                        resetAppState();
                        loadEmails();
                    });
                });
        // Configuration - Updated with proper scopes
        const config = {
            CLIENT_ID: "697317707162-a0991aiahhctrppk3s00po8o0dusi87f.apps.googleusercontent.com",
            DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"],
            // Updated scopes to include full Gmail access
            SCOPES: 'https://mail.google.com/ https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.readonly'
        };

        // DOM Elements
        const elements = {
            authorizeButton: document.getElementById('authorize_button'),
            authorizeButtonPrompt: document.getElementById('authorize_button_prompt'),
            signoutButton: document.getElementById('signout_button'),
            stats: document.getElementById('stats'),
            controls: document.getElementById('controls'),
            emailsContainer: document.getElementById('emails-container'),
            signinPrompt: document.getElementById('signin-prompt'),
            loading: document.getElementById('loading'),
            totalEmails: document.getElementById('total-emails'),
            unreadEmails: document.getElementById('unread-emails'),
            sendersCount: document.getElementById('senders-count'),
            filterType: document.getElementById('filter-type'),
            searchEmails: document.getElementById('search-emails'),
            emailsTableBody: document.getElementById('emails-table-body'),
            emptyState: document.getElementById('empty-state'),
            markAllRead: document.getElementById('mark-all-read'),
            archiveAll: document.getElementById('archive-all'),
            deleteAll: document.getElementById('delete-all'),
            scopeWarning: document.getElementById('scope-warning'),
            stopSyncBtn: document.getElementById('stop-sync-btn')
        };

        // App State
        const state = {
            isLoading: false,
            labels: [],
            nextPageToken: "",
            emailCount: 0,
            totalEmailsProcessed: 0,
            senders: [],
            emailGroups: [],
            allEmails: [],
            currentCategory: 'CATEGORY_PERSONAL',
            currentFilter: 'unread',
            searchQuery: '',
            sortField: 'count',
            sortDirection: 'desc',
            authError: false,
            syncCanceled: false
        };
        /**
         * Utility to chunk arrays
         */
        function chunkArray(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        }
        /**
         * Helper to execute batch modify in chunks of 1000 (Gmail limit)
         */
        async function executeBatchModify(ids, apiCall) {
            const batches = chunkArray(ids, 1000);
            for (let i = 0; i < batches.length; i++) {
                await gapi.client.gmail.users.messages.batchModify({
                    'userId': 'me',
                    'ids': batches[i],
                    ...apiCall
                });
            }
        }



        let tokenClient;
        let gapiInited = false;
        let gisInited = false;

        /**
         * Initialize the Google API client
         */
        async function initializeGapiClient() {
            console.log('Initializing Google API client...');
            try {
                await gapi.client.init({
                    discoveryDocs: config.DISCOVERY_DOCS
                });
                console.log('Google API client initialized successfully');
                gapiInited = true;
                maybeEnableButtons();
            } catch (error) {
                console.error('Error initializing Google API client:', error);
                showError('Failed to initialize Google API client.');
            }
        }

        /**
         * Initialize GIS token client
         */
        function initializeGisClient() {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: config.CLIENT_ID,
                scope: config.SCOPES,
                callback: (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        gapi.client.setToken({ access_token: tokenResponse.access_token });
                        updateSigninStatus(true, tokenResponse);
                    }
                }
            });
            gisInited = true;
            maybeEnableButtons();
        }

        /**
        /**
         * Check if both libraries are loaded before enabling features
         */
        function maybeEnableButtons() {
            if (gapiInited && gisInited) {
                // Set up click handlers
                elements.authorizeButton.onclick = handleAuthClick;
                elements.authorizeButtonPrompt.onclick = handleAuthClick;
                elements.signoutButton.onclick = handleSignoutClick;
                elements.filterType.onchange = handleFilterChange;
                elements.searchEmails.oninput = handleSearchInput;
                elements.markAllRead.onclick = () => handleBulkAction('markRead');
                elements.archiveAll.onclick = () => handleBulkAction('archive');
                elements.deleteAll.onclick = () => handleBulkAction('delete');
                elements.stopSyncBtn.onclick = () => {
                    state.syncCanceled = true;
                    elements.stopSyncBtn.disabled = true;
                    elements.stopSyncBtn.innerHTML = '<i class="bi bi-hourglass me-1"></i> Stopping...';
                };
                
                // Set up category tabs
                document.querySelectorAll('#categoryTab .nav-link').forEach(tab => {
                    tab.addEventListener('click', (e) => {
                        // Update active styling
                        document.querySelectorAll('#categoryTab .nav-link').forEach(t => {
                            t.classList.remove('active');
                        });
                        e.currentTarget.classList.add('active');
                        
                        // Update state and reload
                        state.currentCategory = e.currentTarget.dataset.category;
                        resetAppState();
                        loadEmails();
                    });
                });
                
                // Set up sorting
                document.querySelectorAll('th[data-sort]').forEach(th => {
                    th.addEventListener('click', () => {
                        const field = th.dataset.sort;
                        toggleSort(field);
                    });
                });
                
                updateSigninStatus(false);
            }
        }
                    Swal.fire({
        /**
         * Handle sign-in status changes
         */
        function updateSigninStatus(isSignedIn, tokenResponse = null) {
            console.log('Sign-in status changed:', isSignedIn);
            
            if (isSignedIn) {
                elements.authorizeButton.style.display = 'none';
                elements.authorizeButtonPrompt.style.display = 'none';
                elements.signoutButton.style.display = 'block';
                elements.stats.style.display = 'flex';
                elements.controls.style.display = 'flex';
                document.getElementById('category-tabs').style.display = 'block';
                elements.emailsContainer.style.display = 'block';
                elements.signinPrompt.style.display = 'none';
                elements.scopeWarning.style.display = 'none';
                
                // If token response has scopes, verify them
                if (tokenResponse && tokenResponse.scope) {
                    const hasRequiredScopes = google.accounts.oauth2.hasGrantedAllScopes(
                        tokenResponse,
                        'https://mail.google.com/',
                        'https://www.googleapis.com/auth/gmail.modify',
                        'https://www.googleapis.com/auth/gmail.readonly'
                    );
                    
                    if (!hasRequiredScopes) {
                        handleAuthError('full Gmail access');
                        return;
                    }
                }
                
                // Load initial data
                loadLabels();
                loadEmails();
            } else {
                elements.authorizeButton.style.display = 'block';
                elements.authorizeButtonPrompt.style.display = 'block';
                elements.signoutButton.style.display = 'none';
                elements.stats.style.display = 'none';
                elements.controls.style.display = 'none';
                document.getElementById('category-tabs').style.display = 'none';
                elements.emailsContainer.style.display = 'none';
                elements.signinPrompt.style.display = 'block';
                elements.emailsTableBody.innerHTML = '';
                elements.scopeWarning.style.display = 'none';
            }
        }
        /**
         * Handle sign-in with scope verification
         */
        function handleAuthClick() {
            console.log('Handling auth click...');
            tokenClient.requestAccessToken({prompt: 'consent'});
        }

        /**
         * Handle sign-out
         */
        function handleSignoutClick() {
            const token = gapi.client.getToken();
            if (token !== null) {
                google.accounts.oauth2.revoke(token.access_token, () => {
                    gapi.client.setToken('');
                    resetAppState();
                    updateSigninStatus(false);
                });
            } else {
                resetAppState();
                updateSigninStatus(false);
            }
        }

        /**
         * Reset the app state
         */
        function resetAppState() {
            state.isLoading = false;
            state.labels = [];
            state.nextPageToken = "";
            state.emailCount = 0;
            state.totalEmailsProcessed = 0;
            state.senders = [];
            state.emailGroups = [];
            state.allEmails = [];
            state.authError = false;
        }

        /**
         * Show or hide loading indicator
         */
        function showLoading(show) {
            state.isLoading = show;
            elements.loading.style.display = show ? 'flex' : 'none';
            if (show) {
                elements.stopSyncBtn.style.display = 'inline-block';
                elements.stopSyncBtn.disabled = false;
                elements.stopSyncBtn.innerHTML = '<i class="bi bi-stop-circle me-1"></i> Stop Sync';
            } else {
                elements.stopSyncBtn.style.display = 'none';
            }
        }

        /**
         * Show error message
         */
        function showError(message) {
            Swal.fire({
                title: 'Error',
                text: message,
                icon: 'error',
                confirmButtonText: 'OK',
                background: '#ffffff',
                color: '#202124'
            });
        }

        /**
         * Load user's labels with error handling
         */
        function loadLabels() {
            gapi.client.gmail.users.labels.list({
                'userId': 'me'
            }).then(response => {
                state.labels = response.result.labels || [];
                console.log('Labels loaded:', state.labels.length);
            }).catch(error => {
                console.error('Error loading labels:', error);
                
                // Check if it's an authentication error
                if (error.status === 403) {
                    handleAuthError('labels');
                }
            });
        }

        /**
         * Load emails based on current filter with error handling
         */
        function loadEmails() {
            let query = '';
            
            switch (state.currentFilter) {
                case 'unread': query = 'is:unread'; break;
                case 'read': query = 'is:read'; break;
                case 'starred': query = 'is:starred'; break;
                case 'all': default: query = '';
            }

            // Map category label to search term
            const categoryMap = {
                'CATEGORY_PERSONAL': 'category:primary',
                'CATEGORY_PROMOTIONS': 'category:promotions',
                'CATEGORY_SOCIAL': 'category:social',
                'CATEGORY_UPDATES': 'category:updates'
            };
            const categoryQuery = categoryMap[state.currentCategory] || 'category:primary';
            
            query = query ? `${query} ${categoryQuery}` : categoryQuery;
            
            showLoading(true);
            state.syncCanceled = false;
            
            gapi.client.gmail.users.messages.list({
                'userId': 'me',
                'maxResults': 100, // Reduced from 500 to avoid quota issues
                'labelIds': ['INBOX'],
                'q': query,
                'includeSpamTrash': false
            }).then(response => {
                state.emailCount = response.result.messages ? response.result.messages.length : 0;
                state.nextPageToken = response.result.nextPageToken || "";
                
                console.log(`Found ${state.emailCount} emails with filter: ${state.currentFilter}`);
                
                if (state.emailCount > 0) {
                    processEmailBatch(response.result.messages);
                } else {
                    updateUI();
                    showLoading(false);
                }
            }).catch(error => {
                console.error('Error loading emails:', error);
                
                // Check if it's an authentication error or rate limit
                if (error.status === 403 && error.result && error.result.error && error.result.error.reason === 'rateLimitExceeded') {
                    console.warn('Rate limit exceeded during initial list. Waiting before retrying...');
                    setTimeout(() => {
                        loadEmails();
                    }, 5000);
                } else if (error.status === 403) {
                    handleAuthError('emails');
                    showLoading(false);
                } else {
                    showError('Failed to load emails. Please try again.');
                    showLoading(false);
                }
            });
        }

        /**
         * Handle authentication errors
         */
        function handleAuthError(resource) {
            console.error(`Authentication error accessing ${resource}`);
            state.authError = true;
            elements.scopeWarning.style.display = 'block';
            
            Swal.fire({
                title: 'Authentication Issue',
                html: `
                    <p>This app doesn't have permission to access your ${resource}.</p>
                    <p>This is usually because:</p>
                    <ul class="text-start">
                        <li>You didn't grant all requested permissions</li>
                        <li>The app needs to be re-authenticated</li>
                    </ul>
                    <p>Would you like to sign in again to grant the necessary permissions?</p>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sign In Again',
                cancelButtonText: 'Cancel',
                background: '#ffffff',
                color: '#202124'
            }).then(result => {
                if (result.isConfirmed) {
                    handleSignoutClick();
                    setTimeout(() => {
                        handleAuthClick();
                    }, 1000);
                }
            });
        }

        /**
         * Process a batch of email IDs
         */
        function processEmailBatch(messageIds) {
            if (!messageIds || messageIds.length === 0) {
                if (state.nextPageToken) {
                    loadNextPage();
                } else {
                    updateUI();
                    showLoading(false);
                }
                return;
            }
            
            const batch = gapi.client.newBatch();
            const batchSize = Math.min(messageIds.length, 50); // Reduced batch size
            
            for (let i = 0; i < batchSize; i++) {
                batch.add(gapi.client.gmail.users.messages.get({
                    'userId': 'me',
                    'id': messageIds[i].id,
                    'format': 'metadata',
                    'metadataHeaders': ['From', 'Subject']
                }));
            }
            
            batch.then(response => {
                for (const key in response.result) {
                    if (response.result[key].status === 200) {
                        processEmail(response.result[key].result);
                    }
                }
                
                // Check if user cancelled sync
                if (state.syncCanceled) {
                    updateUI();
                    showLoading(false);
                    return;
                }

                // Process remaining messages with a delay to avoid rate limiting
                if (batchSize < messageIds.length) {
                    setTimeout(() => {
                        processEmailBatch(messageIds.slice(batchSize));
                    }, 1500); // 1.5s delay between batches to stay under 15k units/min
                } else if (state.nextPageToken) {
                    setTimeout(() => {
                        loadNextPage();
                    }, 1500); // 1.5s delay before next page
                } else {
                    updateUI();
                    showLoading(false);
                }
            }).catch(error => {
                console.error('Error processing email batch:', error);
                
                if (error.status === 403 && error.result && error.result.error && error.result.error.reason === 'rateLimitExceeded') {
                    console.warn('Rate limit exceeded. Waiting before retrying...');
                    setTimeout(() => {
                        processEmailBatch(messageIds); // Retry current batch
                    }, 2000);
                } else {
                    showLoading(false);
                }
            });
        }

        /**
         * Process individual email
         */
        function processEmail(email) {
            state.totalEmailsProcessed++;
            
            // Extract sender email
            let sender = 'Unknown Sender';
            const fromHeader = email.payload.headers.find(h => h.name === 'From');
            if (fromHeader) {
                const fromValue = fromHeader.value;
                sender = fromValue.includes('<') ? 
                    fromValue.substring(fromValue.indexOf('<') + 1, fromValue.indexOf('>')) : 
                    fromValue;
            }
            
            // Store email data
            state.allEmails.push({
                id: email.id,
                sender: sender,
                labels: email.labelIds,
                isUnread: email.labelIds.includes('UNREAD')
            });
            
            // Group by sender
            const existingGroup = state.emailGroups.find(g => g.sender === sender);
            if (existingGroup) {
                existingGroup.count++;
                existingGroup.emailIds.push(email.id);
                if (email.labelIds.includes('UNREAD')) {
                    existingGroup.unreadCount++;
                }
            } else {
                state.emailGroups.push({
                    sender: sender,
                    count: 1,
                    unreadCount: email.labelIds.includes('UNREAD') ? 1 : 0,
                    emailIds: [email.id]
                });
            }
            
            // Update UI periodically
            if (state.totalEmailsProcessed % 10 === 0) {
                updateUI();
            }
        }

        /**
         * Load next page of emails
         */
        function loadNextPage() {
            let query = '';
            switch (state.currentFilter) {
                case 'unread': query = 'is:unread'; break;
                case 'read': query = 'is:read'; break;
                case 'starred': query = 'is:starred'; break;
                case 'all': default: query = '';
            }

            const categoryMap = {
                'CATEGORY_PERSONAL': 'category:primary',
                'CATEGORY_PROMOTIONS': 'category:promotions',
                'CATEGORY_SOCIAL': 'category:social',
                'CATEGORY_UPDATES': 'category:updates'
            };
            const categoryQuery = categoryMap[state.currentCategory] || 'category:primary';
            query = query ? `${query} ${categoryQuery}` : categoryQuery;

            gapi.client.gmail.users.messages.list({
                'userId': 'me',
                'maxResults': 100,
                'pageToken': state.nextPageToken,
                'labelIds': ['INBOX'],
                'q': query,
                'includeSpamTrash': false
            }).then(response => {
                state.emailCount += response.result.messages ? response.result.messages.length : 0;
                state.nextPageToken = response.result.nextPageToken || "";

                if (response.result.messages && response.result.messages.length > 0) {
                    processEmailBatch(response.result.messages);
                } else {
                    updateUI();
                    showLoading(false);
                }
            }).catch(error => {
                console.error('Error loading next page:', error);
                
                if (error.status === 403 && error.result && error.result.error && error.result.error.reason === 'rateLimitExceeded') {
                    console.warn('Rate limit exceeded during list. Waiting before retrying...');
                    setTimeout(() => {
                        loadNextPage();
                    }, 5000); // 5s delay on list retry
                } else {
                    showLoading(false);
                }
            });
        }

        /**
         * Toggle sort field and direction
         */
        function toggleSort(field) {
            if (state.sortField === field) {
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortField = field;
                state.sortDirection = 'desc';
            }

            // Update sort indicators
            document.querySelectorAll('th[data-sort]').forEach(th => {
                th.querySelector('i').className = 'bi bi-arrow-down-up ms-1';
                if (th.dataset.sort === state.sortField) {
                    th.querySelector('i').className = state.sortDirection === 'asc' ?
                        'bi bi-arrow-up ms-1' : 'bi bi-arrow-down ms-1';
                }
            });

            updateUI();
        }

        /**
         * Update the UI with current data
         */
        function updateUI() {
            // Update stats
            elements.totalEmails.textContent = state.allEmails.length.toLocaleString();
            elements.unreadEmails.textContent = state.allEmails.filter(e => e.isUnread).length.toLocaleString();
            elements.sendersCount.textContent = state.emailGroups.length.toLocaleString();

            // Filter and sort email groups
            let filteredGroups = getFilteredGroups();

            // Render email groups
            if (filteredGroups.length === 0) {
                elements.emptyState.style.display = 'block';
                elements.emailsTableBody.innerHTML = '';
            } else {
                elements.emptyState.style.display = 'none';

                let html = '';
                filteredGroups.forEach((group, index) => {
                    html += `
                        <tr>
                            <td class="email-sender" title="${group.sender}">${group.sender}</td>
                            <td>
                                <span class="badge bg-primary rounded-pill">${group.count}</span>
                                ${group.unreadCount > 0 ? `<span class="badge bg-warning rounded-pill ms-1">${group.unreadCount} unread</span>` : ''}
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-outline-primary action-btn" onclick="markEmailsAsRead(${index})">
                                        <i class="bi bi-check-lg me-1"></i> Mark Read
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary action-btn" onclick="archiveEmails(${index})">
                                        <i class="bi bi-archive me-1"></i> Archive
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger action-btn" onclick="deleteEmails(${index})">
                                        <i class="bi bi-trash me-1"></i> Delete
                                    </button>
                                    <button class="btn btn-sm btn-outline-warning action-btn" onclick="labelEmails(${index})">
                                        <i class="bi bi-tag me-1"></i> Label
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });

                elements.emailsTableBody.innerHTML = html;
            }
        }

        /**
         * Handle filter change
         */
        function handleFilterChange() {
            state.currentFilter = elements.filterType.value;
            resetAppState();
            loadEmails();
        }

        /**
         * Handle search input
         */
        function handleSearchInput() {
            state.searchQuery = elements.searchEmails.value;
            updateUI();
        }

        /**
         * Mark emails as read
         */
        function markEmailsAsRead(groupIndex) {
            const filteredGroups = getFilteredGroups();
            const group = filteredGroups[groupIndex];

            Swal.fire({
                title: `Mark ${group.count} emails from ${group.sender} as read?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Mark as Read',
                cancelButtonText: 'Cancel',
                reverseButtons: true,
                background: '#ffffff',
                color: '#202124'
            }).then(result => {
                if (result.isConfirmed) {
                    showLoading(true);

                    executeBatchModify(group.emailIds, {
                        'removeLabelIds': ['UNREAD']
                    }).then(() => {
                        // Update local state
                        group.emailIds.forEach(id => {
                            const email = state.allEmails.find(e => e.id === id);
                            if (email) email.isUnread = false;
                        });

                        // Update group unread count
                        group.unreadCount = 0;

                        updateUI();
                        showLoading(false);
                        Swal.fire({
                            title: 'Success',
                            text: 'Emails marked as read',
                            icon: 'success',
                            background: '#ffffff',
                            color: '#202124'
                        });
                    }).catch(error => {
                        console.error('Error marking emails as read:', error);
                        showError('Failed to mark emails as read');
                        showLoading(false);
                    });
                }
            });
        }

        /**
         * Archive emails
         */
        function archiveEmails(groupIndex) {
            const filteredGroups = getFilteredGroups();
            const group = filteredGroups[groupIndex];

            Swal.fire({
                title: `Archive ${group.count} emails from ${group.sender}?`,
                text: 'Emails will be removed from your inbox but not deleted',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Archive',
                cancelButtonText: 'Cancel',
                reverseButtons: true,
                background: '#ffffff',
                color: '#202124'
            }).then(result => {
                if (result.isConfirmed) {
                    showLoading(true);

                    executeBatchModify(group.emailIds, {
                        'removeLabelIds': ['INBOX']
                    }).then(() => {
                        // Remove from local state
                        state.allEmails = state.allEmails.filter(e => !group.emailIds.includes(e.id));
                        state.emailGroups = state.emailGroups.filter(g => g.sender !== group.sender);

                        updateUI();
                        showLoading(false);
                        Swal.fire({
                            title: 'Success',
                            text: 'Emails archived',
                            icon: 'success',
                            background: '#ffffff',
                            color: '#202124'
                        });
                    }).catch(error => {
                        console.error('Error archiving emails:', error);
                        showError('Failed to archive emails');
                        showLoading(false);
                    });
                }
            });
        }

        /**
         * Delete emails
         */
        function deleteEmails(groupIndex) {
            const filteredGroups = getFilteredGroups();
            const group = filteredGroups[groupIndex];

            Swal.fire({
                title: `Delete ${group.count} emails from ${group.sender}?`,
                text: 'This action cannot be undone',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel',
                reverseButtons: true,
                background: '#ffffff',
                color: '#202124'
            }).then(result => {
                if (result.isConfirmed) {
                    showLoading(true);

                    executeBatchModify(group.emailIds, {
                        'addLabelIds': ['TRASH']
                    }).then(() => {
                        // Remove from local state
                        state.allEmails = state.allEmails.filter(e => !group.emailIds.includes(e.id));
                        state.emailGroups = state.emailGroups.filter(g => g.sender !== group.sender);

                        updateUI();
                        showLoading(false);
                        Swal.fire({
                            title: 'Deleted',
                            text: 'Emails moved to trash',
                            icon: 'success',
                            background: '#ffffff',
                            color: '#202124'
                        });
                    }).catch(error => {
                        console.error('Error deleting emails:', error);
                        showError('Failed to delete emails');
                        showLoading(false);
                    });
                }
            });
        }

        /**
         * Add label to emails
         */
        function labelEmails(groupIndex) {
            const filteredGroups = getFilteredGroups();
            const group = filteredGroups[groupIndex];

            // Create label options
            const labelOptions = state.labels
                .filter(label => !label.id.startsWith('CATEGORY_') && label.id !== 'TRASH' && label.id !== 'SPAM')
                .map(label => `<option value="${label.id}">${label.name}</option>`)
                .join('');

            Swal.fire({
                title: `Label ${group.count} emails from ${group.sender}`,
                html: `
                    <select id="label-select" class="form-select mt-3">
                        <option value="" disabled selected>Choose a label</option>
                        ${labelOptions}
                    </select>
                `,
                showCancelButton: true,
                confirmButtonText: 'Apply Label',
                cancelButtonText: 'Cancel',
                reverseButtons: true,
                background: '#ffffff',
                color: '#202124',
                preConfirm: () => {
                    const select = document.getElementById('label-select');
                    return select.value;
                }
            }).then(result => {
                if (result.isConfirmed && result.value) {
                    showLoading(true);

                    executeBatchModify(group.emailIds, {
                        'addLabelIds': [result.value]
                    }).then(() => {
                        showLoading(false);
                        Swal.fire({
                            title: 'Success',
                            text: 'Label applied to emails',
                            icon: 'success',
                            background: '#ffffff',
                            color: '#202124'
                        });
                    }).catch(error => {
                        console.error('Error applying label:', error);
                        showError('Failed to apply label');
                        showLoading(false);
                    });
                }
            });
        }

        /**
         * Handle bulk actions for all visible emails
         */
        function handleBulkAction(action) {
            const filteredGroups = getFilteredGroups();

            if (filteredGroups.length === 0) {
                Swal.fire({
                    title: 'Info',
                    text: 'No emails to process',
                    icon: 'info',
                    background: '#ffffff',
                    color: '#202124'
                });
                return;
            }

            const allIds = filteredGroups.flatMap(group => group.emailIds);
            let confirmMessage, successMessage, apiCall;

            switch (action) {
                case 'markRead':
                    confirmMessage = `Mark all ${allIds.length} emails as read?`;
                    successMessage = 'All emails marked as read';
                    apiCall = {
                        removeLabelIds: ['UNREAD']
                    };
                    break;
                case 'archive':
                    confirmMessage = `Archive all ${allIds.length} emails?`;
                    successMessage = 'All emails archived';
                    apiCall = {
                        removeLabelIds: ['INBOX']
                    };
                    break;
                case 'delete':
                    confirmMessage = `Delete all ${allIds.length} emails?`;
                    successMessage = 'All emails moved to trash';
                    apiCall = {
                        addLabelIds: ['TRASH']
                    };
                    break;
                default:
                    return;
            }

            Swal.fire({
                title: confirmMessage,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: action === 'delete' ? 'Delete All' : 'Confirm',
                cancelButtonText: 'Cancel',
                reverseButtons: true,
                confirmButtonColor: action === 'delete' ? '#d33' : undefined,
                background: '#ffffff',
                color: '#202124'
            }).then(result => {
                if (result.isConfirmed) {
                    showLoading(true);
                    executeBatchModify(allIds, apiCall)
                        .then(() => {
                            // Update local state based on action
                            if (action === 'archive' || action === 'delete') {
                                // Remove all emails from state
                                state.allEmails = state.allEmails.filter(e => !allIds.includes(e.id));
                                state.emailGroups = state.emailGroups.filter(g =>
                                    !filteredGroups.some(fg => fg.sender === g.sender)
                                );
                            } else if (action === 'markRead') {
                                // Mark all emails as read
                                state.allEmails.forEach(e => {
                                    if (allIds.includes(e.id)) e.isUnread = false;
                                });
                                filteredGroups.forEach(group => {
                                    group.unreadCount = 0;
                                });
                            }

                            updateUI();
                            showLoading(false);
                            Swal.fire({
                                title: 'Success',
                                text: successMessage,
                                icon: 'success',
                                background: '#ffffff',
                                color: '#202124'
                            });
                        })
                        .catch(error => {
                            console.error(`Error in bulk ${action}:`, error);
                            showError(`Failed to ${action} all emails`);
                            showLoading(false);
                        });
                }
            });
        }

        /**
         * Get filtered email groups based on current search query
         */
        function getFilteredGroups() {
            let filteredGroups = state.emailGroups.filter(group =>
                group.sender.toLowerCase().includes(state.searchQuery.toLowerCase())
            );
            
            // Sort by current field and direction to match UI
            filteredGroups.sort((a, b) => {
                let comparison = 0;
                if (state.sortField === 'sender') {
                    comparison = a.sender.localeCompare(b.sender);
                } else if (state.sortField === 'count') {
                    comparison = a.count - b.count;
                }
                return state.sortDirection === 'asc' ? comparison : -comparison;
            });
            
            return filteredGroups;
        }

        // Initialize the app when the page loads
        document.addEventListener('DOMContentLoaded', function() {
            // Load the Google API client library
            const gapiScript = document.createElement('script');
            gapiScript.src = 'https://apis.google.com/js/api.js';
            gapiScript.async = true;
            gapiScript.defer = true;
            gapiScript.onload = function() {
                console.log('Google API script loaded');
                gapi.load('client', initializeGapiClient);
            };
            gapiScript.onerror = function() {
                console.error('Failed to load Google API client');
                showError('Failed to load required Google API libraries. Please check your internet connection.');
            };
            document.head.appendChild(gapiScript);

            // Load Google Identity Services library
            const gisScript = document.createElement('script');
            gisScript.src = 'https://accounts.google.com/gsi/client';
            gisScript.async = true;
            gisScript.defer = true;
            gisScript.onload = function() {
                console.log('Google Identity Services script loaded');
                initializeGisClient();
            };
            gisScript.onerror = function() {
                console.error('Failed to load Google Identity Services');
                showError('Failed to load authentication libraries. Please check your internet connection.');
            };
            document.head.appendChild(gisScript);

            // Register Service Worker for PWA
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('./sw.js')
                        .then(registration => {
                            console.log('ServiceWorker registration successful with scope: ', registration.scope);
                        })
                        .catch(err => {
                            console.log('ServiceWorker registration failed: ', err);
                        });
                });
            }
        });
