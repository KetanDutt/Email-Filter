// Client ID and API key from the Developer Console
let CLIENT_ID = '697317707162-a677q5u0naj9mmnia0e65qcgrjo9fh10.apps.googleusercontent.com';
let API_KEY = 'AIzaSyANjFshGIMaOip50aX9lFqrOa_gxqMx2VQ';

// Array of API discovery doc URLs for APIs used by the quickstart
let DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
let SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify';
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
        let signed = gapi.auth2.getAuthInstance().isSignedIn.get();
        if (signed)
            updateSigninStatus(true, gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail());
        else
            updateSigninStatus(false, "");
        authorizeButton.onclick = handleAuthClick;
        signoutButton.onclick = handleSignoutClick;
    }, function (error) {
        appendPre(JSON.stringify(error, null, 2));
    });
}

let Loading = false;
let LablesArray = [];
let nextPageToken = "";
let callCount = 0;
let callCountLimit = 4;
let EmailCount = 0;
let arr = [];
let TotalEmails = 0;
let ucount = 0;
let ufcount = 0;
let emailArray = [];
let archivingEmail;
let deletingEmail;

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn, ID) {
    if (isSignedIn) {
        document.getElementById('emails').innerHTML = "<h5>Getting Emails Please Wait....</h5>";
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
        Loading = true;
        showLoadingDialog('Loading Emails', 'Please wait.. <b></b> Loaded.');
        listLabels();
        listEmails();
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
    Loading = false;
    callCountLimit = 4;
    LablesArray = [];
    arr = [];
    emailArray = [];
    nextPageToken = "";
    callCount = 0;
    EmailCount = 0;
    TotalEmails = 0;
    ucount = 0;
    ufcount = 0;
    archivingEmail = {};
    deletingEmail = {};
    location.reload();
}

/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre(message) {
    // let pre = document.getElementById('content');
    // let textContent = document.createTextNode(message + '\n');
    // pre.appendChild(textContent);
}

/**
 * Print all Labels in the authorized user's inbox. If no label
 * are found an appropriate message is printed.
 */
function listLabels() {
    gapi.client.gmail.users.labels.list({
        'userId': 'me'
    }).then(function (response) {
        // console.log(response);
        let labels = response.result.labels;
        if (labels && labels.length > 0) {
            for (i = 0; i < labels.length; i++) {
                let label = labels[i];
                // appendPre(label.name)
                LablesArray.push(label);
            }
        }
    });
}

function showLoadingDialog(title, html) {
    Swal.fire({
        title: title,
        html: html,
        timer: 2000,
        allowOutsideClick: false,
        willOpen: () => {
            Swal.showLoading();
            timerInterval = setInterval(() => {
                const content = Swal.getContent()
                if (content) {
                    const b = content.querySelector('b')
                    if (b) {
                        b.textContent = TotalEmails + "/" + EmailCount
                    }
                }
                if (Loading) {
                    Swal.increaseTimer(2000);
                }
                else {
                    console.log("Loading complete");
                    Swal.stopTimer();
                    Swal.hideLoading();
                    Swal.close();
                    clearInterval(timerInterval);
                }
            }, 100);
        }
    }).then(() => {
    });
}


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
        EmailCount += messages.length;
        if (messages && messages.length > 0) {
            for (i = 0; i < messages.length; i++) {
                getEmailbyID(messages[i].id)
            }
            listNextEmails();
        }
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
        EmailCount += messages.length;
        if (messages && messages.length > 0) {
            for (i = 0; i < messages.length; i++) {
                getEmailbyID(messages[i].id)
            }
            if (response.result.nextPageToken) {
                listNextEmails();
            }
        }
    });
}


function reset() {
    arr.sort(function (a, b) { return b.num - a.num });
    let elem = document.getElementById('emails');
    let s = "<h5>Total email Count  <b>" + TotalEmails + "</b></h5>";
    // s += "Inbox email Count  " + ufcount + "<br><br>";
    s += '<table class="highlight"><thead><th>Count</th><th>Email</th><th>Actions</th></thead><tbody>';
    for (const obj in arr) {
        s += '<tr><td><div style="background: white;border-radius: 100px;color: black;width: 40px;padding: 10px;text-align: center;">'
            + arr[obj].num
            + '</div></td><td>'
            + arr[obj].email
            + '</td><td>'
            + '<a class="btn waves-effect waves-dark red" onClick=deleteEmail("' + obj + '") style="margin-right: 5px;margin-bottom: 5px;"><i class="material-icons left">delete_forever</i>Trash</a>'
            + '<a class="btn waves-effect waves-dark green" onClick=archiveEmail("' + obj + '") style="margin-right: 5px;margin-bottom: 5px;"><i class="material-icons left">archive</i>Spam</a>'
            + '</td></tr>';
    }
    s += "</tbody></table>";
    elem.innerHTML = s;
}

function deleteEmail(ID) {
    deletingEmail = arr[ID];
    Swal.fire({
        title: 'Are you sure?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Trash it!'
    }).then((result) => {
        if (result.isConfirmed) {
            Loading = true;
            showLoadingDialog('Archiving Emails', 'Please wait..');
            let ids = [];
            for (const elem in emailArray) {
                if (emailArray[elem].email === deletingEmail.email) {
                    ids.push(emailArray[elem].id + "");
                }
            }
            let addLabelIds = ["TRASH"];
            gapi.client.gmail.users.messages.batchModify({
                'userId': 'me',
                'ids': ids,
                'addLabelIds': addLabelIds
            }).then(function (response) {
                Loading = false;
                for (const elem in arr) {
                    if (arr[elem].email === deletingEmail.email) {
                        TotalEmails -= arr[elem].num;
                        arr.splice(elem, 1);
                    }
                }
                reset();
            });
        }
    });
}

function archiveEmail(ID) {
    archivingEmail = arr[ID];
    Swal.fire({
        title: 'Are you sure?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Spam it!'
    }).then((result) => {
        if (result.isConfirmed) {
            Loading = true;
            showLoadingDialog('Archiving Emails', 'Please wait..');
            let ids = [];
            for (const elem in emailArray) {
                if (emailArray[elem].email === archivingEmail.email) {
                    ids.push(emailArray[elem].id + "");
                }
            }
            let addLabelIds = ["SPAM"];
            gapi.client.gmail.users.messages.batchModify({
                'userId': 'me',
                'ids': ids,
                'addLabelIds': addLabelIds
            }).then(function (response) {
                Loading = false;
                for (const elem in arr) {
                    if (arr[elem].email === archivingEmail.email) {
                        TotalEmails -= arr[elem].num;
                        arr.splice(elem, 1);
                    }
                }
                reset();
            });
        }
    });
}


function getEmailbyID(id) {
    gapi.client.gmail.users.messages.get({
        'userId': 'me',
        "id": id
    }).then(function (response) {
        TotalEmails++;
        let email = "";
        // let unread = false;
        // let extra = false;
        // let inbox = false;
        // let labels = response.result.labelIds;
        // for (i = 0; i < labels.length; i++) {
        //     if (labels[i] === "UNREAD") {
        //         unread = true;
        //         break;
        //     }
        // }
        // for (i = 0; i < labels.length; i++) {
        //     if (labels[i] === "CATEGORY_SOCIAL" || labels[i] === "CATEGORY_PROMOTIONS") {
        //         extra = true;
        //         break;
        //     }
        // }
        // for (i = 0; i < labels.length; i++) {
        //     if (labels[i] === "INBOX") {
        //         inbox = true;
        //         break;
        //     }
        // }
        // if (unread && (inbox || extra)) {
        ufcount++;
        let headers = response.result.payload.headers;
        if (headers && headers.length > 0) {
            for (i = 0; i < headers.length; i++) {
                let message = headers[i];
                if (message.name === "From") {
                    // appendPre(message.value);
                    if (message.value.indexOf("<") !== -1) {
                        email = message.value.substring(message.value.indexOf("<") + 1, message.value.indexOf(">"));
                    } else {
                        email = message.value;
                    }
                    let found = false;
                    for (const obj in arr) {
                        if (arr[obj].email === email) {
                            found = true;
                            arr[obj].num++;
                        }
                    }
                    if (!found) {
                        arr.push({
                            email: email,
                            num: 1
                        });
                    }
                    break;
                }
            }
        }
        emailArray.push({
            id: response.result.id,
            email: email
        });
        // }
        reset();
        if (EmailCount === TotalEmails) {
            console.log(EmailCount + "    " + TotalEmails);
            Loading = false;
        }
    });
}