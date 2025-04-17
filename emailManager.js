// Client ID and API key from the Developer Console
// let CLIENT_ID = '697317707162-a677q5u0naj9mmnia0e65qcgrjo9fh10.apps.googleusercontent.com';
// let API_KEY = 'AIzaSyANjFshGIMaOip50aX9lFqrOa_gxqMx2VQ';

// Client configuration
const config = {
    CLIENT_ID: '697317707162-a677q5u0naj9mmnia0e65qcgrjo9fh10.apps.googleusercontent.com',
    API_KEY: 'AIzaSyANjFshGIMaOip50aX9lFqrOa_gxqMx2VQ',
    DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"],
    SCOPES: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify'
  };
  
  // DOM Elements
  const elements = {
    authorizeButton: document.getElementById('authorize_button'),
    signoutButton: document.getElementById('signout_button'),
    emailsContainer: document.getElementById('emails'),
    loadingIndicator: document.getElementById('loading'),
    filterControls: document.getElementById('filter-controls'),
    statsContainer: document.getElementById('stats'),
    totalEmails: document.getElementById('total-emails'),
    unreadEmails: document.getElementById('unread-emails'),
    sendersCount: document.getElementById('senders-count'),
    filterType: document.getElementById('filter-type'),
    searchEmails: document.getElementById('search-emails'),
    themeToggle: document.getElementById('theme-toggle')
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
    currentFilter: 'unread',
    searchQuery: ''
  };
  
  /**
   * Initialize the app when the page loads
   */
  function handleClientLoad() {
    gapi.load('client:auth2', initClient);
  }
  
  /**
   * Initialize the Google API client
   */
  function initClient() {
    gapi.client.init({
      apiKey: config.API_KEY,
      clientId: config.CLIENT_ID,
      discoveryDocs: config.DISCOVERY_DOCS,
      scope: config.SCOPES
    }).then(() => {
      // Set up auth listeners
      gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
      
      // Handle initial auth state
      const isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
      updateSigninStatus(isSignedIn);
      
      // Set up click handlers
      elements.authorizeButton.onclick = handleAuthClick;
      elements.signoutButton.onclick = handleSignoutClick;
      elements.filterType.onchange = handleFilterChange;
      elements.searchEmails.oninput = handleSearchInput;
      elements.themeToggle.onclick = toggleTheme;
      
      // Initialize Materialize components
      M.AutoInit();
    }).catch(error => {
      console.error('Error initializing Google API client:', error);
      showError('Failed to initialize. Please try again later.');
    });
  }
  
  /**
   * Handle sign-in status changes
   */
  function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
      elements.authorizeButton.style.display = 'none';
      elements.signoutButton.style.display = 'block';
      elements.filterControls.style.display = 'flex';
      elements.statsContainer.style.display = 'block';
      
      // Initialize the app
      resetAppState();
      showLoading(true);
      loadLabels();
      loadEmails();
    } else {
      elements.authorizeButton.style.display = 'block';
      elements.signoutButton.style.display = 'none';
      elements.filterControls.style.display = 'none';
      elements.statsContainer.style.display = 'none';
      elements.emailsContainer.innerHTML = '';
    }
  }
  
  /**
   * Handle sign-in
   */
  function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn();
  }
  
  /**
   * Handle sign-out
   */
  function handleSignoutClick() {
    gapi.auth2.getAuthInstance().signOut();
    resetAppState();
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
    state.currentFilter = 'unread';
    state.searchQuery = '';
  }
  
  /**
   * Toggle between dark and light theme
   */
  function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    document.body.classList.toggle('light-theme');
    
    const icon = elements.themeToggle.querySelector('i');
    if (document.body.classList.contains('dark-theme')) {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    } else {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    }
  }
  
  /**
   * Show or hide loading indicator
   */
  function showLoading(show) {
    state.isLoading = show;
    elements.loadingIndicator.style.display = show ? 'block' : 'none';
  }
  
  /**
   * Show error message
   */
  function showError(message) {
    Swal.fire({
      title: 'Error',
      text: message,
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
  
  /**
   * Load user's labels
   */
  function loadLabels() {
    gapi.client.gmail.users.labels.list({
      'userId': 'me'
    }).then(response => {
      state.labels = response.result.labels || [];
      console.log('Labels loaded:', state.labels);
    }).catch(error => {
      console.error('Error loading labels:', error);
    });
  }
  
  /**
   * Load emails based on current filter
   */
  function loadEmails() {
    let query = '';
    
    switch (state.currentFilter) {
      case 'unread':
        query = 'is:unread';
        break;
      case 'read':
        query = 'is:read';
        break;
      case 'starred':
        query = 'is:starred';
        break;
      case 'all':
      default:
        query = '';
    }
    
    showLoading(true);
    
    gapi.client.gmail.users.messages.list({
      'userId': 'me',
      'maxResults': 500,
      'labelIds': ['INBOX'],
      'q': query,
      'includeSpamTrash': false
    }).then(response => {
      state.emailCount = response.result.messages ? response.result.messages.length : 0;
      state.nextPageToken = response.result.nextPageToken || "";
      
      if (state.emailCount > 0) {
        processEmailBatch(response.result.messages);
      } else {
        updateUI();
        showLoading(false);
      }
    }).catch(error => {
      console.error('Error loading emails:', error);
      showError('Failed to load emails. Please try again.');
      showLoading(false);
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
    const batchSize = Math.min(messageIds.length, 100); // Limit batch size
    
    for (let i = 0; i < batchSize; i++) {
      batch.add(gapi.client.gmail.users.messages.get({
        'userId': 'me',
        'id': messageIds[i].id,
        'format': 'metadata',
        'metadataHeaders': ['From']
      }));
    }
    
    batch.then(response => {
      for (const key in response.result) {
        if (response.result[key].status === 200) {
          processEmail(response.result[key].result);
        }
      }
      
      // Process remaining messages
      if (batchSize < messageIds.length) {
        processEmailBatch(messageIds.slice(batchSize));
      } else if (state.nextPageToken) {
        loadNextPage();
      } else {
        updateUI();
        showLoading(false);
      }
    }).catch(error => {
      console.error('Error processing email batch:', error);
      showLoading(false);
    });
  }
  
  /**
   * Process individual email
   */
  function processEmail(email) {
    state.totalEmailsProcessed++;
    
    // Extract sender email
    let sender = '';
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
    } else {
      state.emailGroups.push({
        sender: sender,
        count: 1,
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
    gapi.client.gmail.users.messages.list({
      'userId': 'me',
      'maxResults': 500,
      'pageToken': state.nextPageToken,
      'labelIds': ['INBOX'],
      'q': state.currentFilter === 'unread' ? 'is:unread' : '',
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
      showLoading(false);
    });
  }
  
  /**
   * Update the UI with current data
   */
  function updateUI() {
    // Update stats
    elements.totalEmails.textContent = state.allEmails.length;
    elements.unreadEmails.textContent = state.allEmails.filter(e => e.isUnread).length;
    elements.sendersCount.textContent = state.emailGroups.length;
    
    // Filter email groups based on search query
    const filteredGroups = state.emailGroups.filter(group => 
      group.sender.toLowerCase().includes(state.searchQuery.toLowerCase())
    );
    
    // Sort by count (descending)
    filteredGroups.sort((a, b) => b.count - a.count);
    
    // Render email groups
    let html = '';
    
    if (filteredGroups.length === 0) {
      html = '<div class="col s12 center-align"><h5>No emails found</h5></div>';
    } else {
      filteredGroups.forEach((group, index) => {
        html += `
          <div class="col s12 m6 l4">
            <div class="card email-card">
              <div class="card-content email-header">
                <span class="card-title truncate" title="${group.sender}">${group.sender}</span>
                <span class="email-count badge blue darken-2 white-text">${group.count}</span>
              </div>
              <div class="card-action email-actions">
                <a class="waves-effect waves-light btn btn-action blue darken-1" 
                   onclick="markEmailsAsRead(${index})">
                  <i class="material-icons left">mark_email_read</i> Mark Read
                </a>
                <a class="waves-effect waves-light btn btn-action green darken-1" 
                   onclick="archiveEmails(${index})">
                  <i class="material-icons left">archive</i> Archive
                </a>
                <a class="waves-effect waves-light btn btn-action red darken-1" 
                   onclick="deleteEmails(${index})">
                  <i class="material-icons left">delete</i> Delete
                </a>
                <a class="waves-effect waves-light btn-floating btn-small orange darken-2" 
                   onclick="labelEmails(${index})" title="Add Label">
                  <i class="material-icons">label</i>
                </a>
              </div>
            </div>
          </div>
        `;
      });
    }
    
    elements.emailsContainer.innerHTML = html;
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
    const group = state.emailGroups[groupIndex];
    
    Swal.fire({
      title: `Mark ${group.count} emails from ${group.sender} as read?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Mark as Read',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then(result => {
      if (result.isConfirmed) {
        showLoading(true);
        
        gapi.client.gmail.users.messages.batchModify({
          'userId': 'me',
          'ids': group.emailIds,
          'removeLabelIds': ['UNREAD']
        }).then(() => {
          // Update local state
          group.emailIds.forEach(id => {
            const email = state.allEmails.find(e => e.id === id);
            if (email) email.isUnread = false;
          });
          
          updateUI();
          showLoading(false);
          Swal.fire('Success', 'Emails marked as read', 'success');
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
    const group = state.emailGroups[groupIndex];
    
    Swal.fire({
      title: `Archive ${group.count} emails from ${group.sender}?`,
      text: 'Emails will be removed from your inbox but not deleted',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Archive',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then(result => {
      if (result.isConfirmed) {
        showLoading(true);
        
        gapi.client.gmail.users.messages.batchModify({
          'userId': 'me',
          'ids': group.emailIds,
          'removeLabelIds': ['INBOX']
        }).then(() => {
          // Remove from local state
          state.allEmails = state.allEmails.filter(e => !group.emailIds.includes(e.id));
          state.emailGroups.splice(groupIndex, 1);
          
          updateUI();
          showLoading(false);
          Swal.fire('Success', 'Emails archived', 'success');
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
    const group = state.emailGroups[groupIndex];
    
    Swal.fire({
      title: `Delete ${group.count} emails from ${group.sender}?`,
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then(result => {
      if (result.isConfirmed) {
        showLoading(true);
        
        gapi.client.gmail.users.messages.batchModify({
          'userId': 'me',
          'ids': group.emailIds,
          'addLabelIds': ['TRASH']
        }).then(() => {
          // Remove from local state
          state.allEmails = state.allEmails.filter(e => !group.emailIds.includes(e.id));
          state.emailGroups.splice(groupIndex, 1);
          
          updateUI();
          showLoading(false);
          Swal.fire('Deleted', 'Emails moved to trash', 'success');
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
    const group = state.emailGroups[groupIndex];
    
    // Create label options
    const labelOptions = state.labels
      .filter(label => !label.id.startsWith('CATEGORY_') && label.id !== 'TRASH' && label.id !== 'SPAM')
      .map(label => `<option value="${label.id}">${label.name}</option>`)
      .join('');
    
    Swal.fire({
      title: `Label ${group.count} emails from ${group.sender}`,
      html: `
        <select id="label-select" class="browser-default">
          <option value="" disabled selected>Choose a label</option>
          ${labelOptions}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Apply Label',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      preConfirm: () => {
        const select = document.getElementById('label-select');
        return select.value;
      }
    }).then(result => {
      if (result.isConfirmed && result.value) {
        showLoading(true);
        
        gapi.client.gmail.users.messages.batchModify({
          'userId': 'me',
          'ids': group.emailIds,
          'addLabelIds': [result.value]
        }).then(() => {
          showLoading(false);
          Swal.fire('Success', 'Label applied to emails', 'success');
        }).catch(error => {
          console.error('Error applying label:', error);
          showError('Failed to apply label');
          showLoading(false);
        });
      }
    });
  }