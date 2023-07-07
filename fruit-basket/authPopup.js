import { msalConfig, loginRequest, driveRequest } from './authConfig.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js'
import { getAuth, signInWithPopup, signInWithRedirect, OAuthProvider, GoogleAuthProvider, setPersistence, browserSessionPersistence, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js'
import { getFirestore, collection, query, where, orderBy, getDocs, doc, addDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js'
import { showWelcomeMessage, updateUI } from "./ui.js";
export { signIn, signOut, seeProfile, readMail, readOneDrive, readFirebase, listFolder };

// Create the main myMSALObj instance
// configuration parameters are located at authConfig.js
const myMSALObj = new msal.PublicClientApplication(msalConfig);

let username = "";

function selectAccount() {

    /**
     * See here for more info on account retrieval: 
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
     */

    const currentAccounts = myMSALObj.getAllAccounts();
    if (currentAccounts.length === 0) {
        return;
    } else if (currentAccounts.length > 1) {
        // Add choose account code here
        console.warn("Multiple accounts detected.");
    } else if (currentAccounts.length === 1) {
        username = currentAccounts[0].username;
        showWelcomeMessage(username);
    }
}

function handleResponse(response) {

    /**
     * To see the full list of response object properties, visit:
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#response
     */

    if (response !== null) {
        username = response.account.username;
        showWelcomeMessage(username);
    } else {
        selectAccount();
    }
}

function signIn() {

    /**
     * You can pass a custom request object below. This will override the initial configuration. For more information, visit:
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#request
     */
  console.log(msalConfig);
    myMSALObj.loginPopup(loginRequest)
        .then(handleResponse)
        .catch(error => {
            console.error(error);
        });
}

function signOut() {
    console.log(username);
    console.log(msalConfig.auth.redirectUri);
      const logoutRequest = {
          account: myMSALObj.getAccountByUsername(username),
          postLogoutRedirectUri: msalConfig.auth.redirectUri,
          mainWindowRedirectUri: msalConfig.auth.redirectUri
      };
  
      myMSALObj.logoutPopup(logoutRequest);
    /**
     * You can pass a custom request object below. This will override the initial configuration. For more information, visit:
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#request
     */
}

function getTokenPopup(request) {

    /**
     * See here for more info on account retrieval: 
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
     */
    request.account = myMSALObj.getAccountByUsername(username);
    console.log(request);
    
    return myMSALObj.acquireTokenSilent(request)
        .catch(error => {
            console.warn("silent token acquisition fails. acquiring token using popup");
            if (error instanceof msal.InteractionRequiredAuthError) {
                // fallback to interaction when silent call fails
                return myMSALObj.acquireTokenPopup(request)
                    .then(tokenResponse => {
                        console.log(tokenResponse);
                        return tokenResponse;
                    }).catch(error => {
                        console.error(error);
                    });
            } else {
                console.warn(error);   
            }
    });
}

function seeProfile() {
    getTokenPopup(loginRequest)
        .then(response => {
            callMSGraph(graphConfig.graphMeEndpoint, response.accessToken, updateUI);
        }).catch(error => {
            console.error(error);
        });
}

function readMail() {
    getTokenPopup(tokenRequest)
        .then(response => {
            callMSGraph(graphConfig.graphMailEndpoint, response.accessToken, updateUI);
        }).catch(error => {
            console.error(error);
        });
}

function readOneDrive() {
  getTokenPopup(driveRequest)
  .then(response => {
      callMSGraph(graphConfig.graphOneDriveEndpoint, response.accessToken, updateUI);
  }).catch(error => {
      console.error(error);
  });
}

function listFolder(folder, callback) {
  getTokenPopup(driveRequest)
  .then(response => {
      if (folder.length > 0) {
        callMSGraph(`https://graph.microsoft.com/v1.0/me/drive/items/${folder}/children`, response.accessToken, callback);
      } else {
        callMSGraph(graphConfig.graphOneDriveEndpoint, response.accessToken, callback);
      }
  }).catch(error => {
      console.error(error);
  });
}

function readFirebase() {
  const firebaseConfig = {
    apiKey: 'AIzaSyDusyt8yl2cHmZXxxrISn-gc8mKqH5WvMc',
    projectId: 'assorted-fruits',
    authDomain: "assorted-fruits.firebaseapp.com",
  };
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  onAuthStateChanged(auth, (user) => {
    console.log(user);
    setPersistence(auth, browserSessionPersistence)
    .then(() => {
      if (!user) {
        const provider = new OAuthProvider('microsoft.com');
        signInWithPopup(auth, provider)
        .then((result) => {
          getDocs(query(collection(db, 'women'), orderBy('yomi'))).then((snapshot) => {
            snapshot.docs.forEach((w) => {
              console.log(w.data().name);
            });
          });
        });
      } else {
        getDocs(query(collection(db, 'women'), orderBy('yomi'))).then((snapshot) => {
          snapshot.docs.forEach((w) => {
            console.log(w.data().name);
          });
        });
      }
    });
  });
}

// jqueryのdocument.readyはもう不要とか言われているけど、変数初期化のタイミングが遅延したりするのでやっぱり必要です。
$(() => {
  selectAccount();
});
//selectAccount();