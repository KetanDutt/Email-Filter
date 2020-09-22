// Client ID and API key from the Developer Console
let CLIENT_ID = '697317707162-a677q5u0naj9mmnia0e65qcgrjo9fh10.apps.googleusercontent.com';
let API_KEY = 'AIzaSyANjFshGIMaOip50aX9lFqrOa_gxqMx2VQ';

// Array of API discovery doc URLs for APIs used by the quickstart
let DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
let SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
let authorizeButton = document.getElementById('authorize_button');
let signoutButton = document.getElementById('signout_button');

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        // Handle the initial sign-in state.
        console.log(gapi.auth2.getAuthInstance());
        console.log(gapi.auth2.getAuthInstance().currentUser.get());
        // console.log(gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile());
        updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get(), "");
        authorizeButton.onclick = handleAuthClick;
        signoutButton.onclick = handleSignoutClick;
    }, function (error) {
        appendPre(JSON.stringify(error, null, 2));
    });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn, ID) {
    if (isSignedIn) {
        Swal.fire({
            title: 'Logged IN',
            text: "Logged in as " + ID,
            type: 'success',
            showCancelButton: false,
        }).then(() => {
            document.getElementById('emails').innerText = "Getting Emails Please Wait....";
            authorizeButton.style.display = 'none';
            signoutButton.style.display = 'block';
            // listLabels();
            listEmails();
        });
    } else {
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
    }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
    gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
    gapi.auth2.getAuthInstance().signOut();
    document.getElementById('emails').innerText = "";
}

/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre(message) {
    let pre = document.getElementById('content');
    let textContent = document.createTextNode(message + '\n');
    pre.appendChild(textContent);
}

/**
 * Print all Labels in the authorized user's inbox. If no label
 * are found an appropriate message is printed.
 */
function listLabels() {
    gapi.client.gmail.users.labels.list({
        'userId': 'me'
    }).then(function (response) {
        let labels = response.result.labels;
        appendPre('Labels:');
        if (labels && labels.length > 0) {
            for (i = 0; i < labels.length; i++) {
                let label = labels[i];
                appendPre(label.name)
            }
        } else {
            appendPre('No Labels found.');
        }
    });
}

let nextPageToken = "";
let callCount = 0;
function listEmails() {
    gapi.client.gmail.users.messages.list({
        'userId': 'me',
        "maxResults": 500,
        "includeSpamTrash": false
    }).then(function (response) {
        console.log(response);
        callCount++;
        nextPageToken = response.result.nextPageToken;
        let messages = response.result.messages;
        if (messages && messages.length > 0) {
            for (i = 0; i < messages.length; i++) {
                getEmailbyID(messages[i].id)
            }
        } else {
            appendPre('No Labels found.');
        }
        listNextEmails();
    });
}

function listNextEmails() {
    gapi.client.gmail.users.messages.list({
        'userId': 'me',
        "maxResults": 500,
        "pageToken": nextPageToken,
        "includeSpamTrash": false
    }).then(function (response) {
        console.log(response);
        callCount++;
        nextPageToken = response.result.nextPageToken;
        let messages = response.result.messages;
        if (messages && messages.length > 0) {
            for (i = 0; i < messages.length; i++) {
                getEmailbyID(messages[i].id)
            }
        } else {
            appendPre('No Labels found.');
        }
        if (callCount < 4)
            listNextEmails();
    });
}

let arr = [];
let tcount = 0;
let ucount = 0;
let ufcount = 0;

function reset() {
    arr.sort(function (a, b) { return b.num - a.num });
    let elem = document.getElementById('emails');
    let s = "Total email Count  " + tcount + "\n";
    // s += "Useless email Count  " + ucount + "\n\n";
    s += "Inbox email Count  " + ufcount + "\n\n";
    for (const obj in arr) {
        s += arr[obj].num + "  -   " + arr[obj].email + "\n";
    }
    elem.innerText = s;
}

function getEmailbyID(id) {
    gapi.client.gmail.users.messages.get({
        'userId': 'me',
        "id": id
    }).then(function (response) {
        tcount++;
        let unread = false;
        let inbox = false;
        let labels = response.result.labelIds;
        for (i = 0; i < labels.length; i++) {
            if (labels[i] === "UNREAD") {
                unread = true;
                break;
            }
        }
        // for (i = 0; i < labels.length; i++) {
        //   if (labels[i] === "CATEGORY_SOCIAL" || labels[i] === "CATEGORY_PROMOTIONS") {
        //     unread = false;
        //     ucount++;
        //     break;
        //   }
        // } 
        for (i = 0; i < labels.length; i++) {
            if (labels[i] === "INBOX") {
                inbox = true;
                break;
            }
        }
        if (unread && inbox) {
            ufcount++;
            // console.log(response);
            let headers = response.result.payload.headers;
            if (headers && headers.length > 0) {
                for (i = 0; i < headers.length; i++) {
                    let message = headers[i];
                    if (message.name === "From") {
                        // appendPre(message.value);
                        let val = "";
                        if (message.value.indexOf("<") !== -1) {
                            val = message.value.substring(message.value.indexOf("<") + 1, message.value.indexOf(">"));
                        } else {
                            val = message.value;
                        }
                        let found = false;
                        for (const obj in arr) {
                            if (arr[obj].email === val) {
                                found = true;
                                arr[obj].num++;
                            }
                        }
                        if (!found) {
                            arr.push({
                                email: val,
                                num: 1
                            });
                        }
                    }
                }
            }
        }
        reset();
        // if (tcount == 500 || tcount == 1000 || tcount == 1500) {
        //   listNextEmails();
        // }
    });
}