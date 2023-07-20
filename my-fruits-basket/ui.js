import { signIn, signOut, readFirebase } from './authPopup.js';
import { signInDatabase } from './db.js';
export { showWelcomeMessage, updateUI };

// Select DOM elements to work with
const mailButton = document.getElementById("readMail");
const profileButton = document.getElementById("seeProfile");
const profileDiv = document.getElementById("profile-div");

const $signInButton = $('#sign-in-button');
const $humburgerButton = $('#fb-humburger-button');
const $mainArea = $('#main-area');
const $readFirebaseButton = $('#readFirebase');

$signInButton.on('click', signIn);
$readFirebaseButton.on('click', readFirebase);

function showWelcomeMessage(username) {
    // Reconfiguring DOM elements
    $signInButton.off();
    $signInButton.on('click', signOut);
    $signInButton.html('Sign Out');
    $humburgerButton.prop('disabled', false);
    $mainArea.removeClass('d-none');
    signInDatabase();
  }

function updateUI(data, endpoint) {
    console.log('Graph API responded at: ' + new Date().toString());

    if (endpoint === graphConfig.graphMeEndpoint) {
        profileDiv.innerHTML = ''
        const title = document.createElement('p');
        title.innerHTML = "<strong>Title: </strong>" + data.jobTitle;
        const email = document.createElement('p');
        email.innerHTML = "<strong>Mail: </strong>" + data.mail;
        const phone = document.createElement('p');
        phone.innerHTML = "<strong>Phone: </strong>" + data.businessPhones[0];
        const address = document.createElement('p');
        address.innerHTML = "<strong>Location: </strong>" + data.officeLocation;
        profileDiv.appendChild(title);
        profileDiv.appendChild(email);
        profileDiv.appendChild(phone);
        profileDiv.appendChild(address);

    } else if (endpoint === graphConfig.graphMailEndpoint) {
        if (!data.value) {
            alert("You do not have a mailbox!")
        } else if (data.value.length < 1) {
            alert("Your mailbox is empty!")
        } else {
            const tabContent = document.getElementById("nav-tabContent");
            const tabList = document.getElementById("list-tab");
            tabList.innerHTML = ''; // clear tabList at each readMail call

            data.value.map((d, i) => {
                // Keeping it simple
                if (i < 10) {
                    const listItem = document.createElement("a");
                    listItem.setAttribute("class", "list-group-item list-group-item-action")
                    listItem.setAttribute("id", "list" + i + "list")
                    listItem.setAttribute("data-toggle", "list")
                    listItem.setAttribute("href", "#list" + i)
                    listItem.setAttribute("role", "tab")
                    listItem.setAttribute("aria-controls", i)
                    listItem.innerHTML = d.subject;
                    tabList.appendChild(listItem)

                    const contentItem = document.createElement("div");
                    contentItem.setAttribute("class", "tab-pane fade")
                    contentItem.setAttribute("id", "list" + i)
                    contentItem.setAttribute("role", "tabpanel")
                    contentItem.setAttribute("aria-labelledby", "list" + i + "list")
                    contentItem.innerHTML = "<strong> from: " + d.from.emailAddress.address + "</strong><br><br>" + d.bodyPreview + "...";
                    tabContent.appendChild(contentItem);
                }
            });
        }
    } else if (endpoint === graphConfig.graphOneDriveEndpoint) {
      console.log(data.value);
      console.log(data.value[6]);
      const url = data.value[6]['@microsoft.graph.downloadUrl'];
      const img = document.getElementById('test-image');
      img.setAttribute("src", url);
    }
}