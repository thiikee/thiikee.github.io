import { signInDatabase, isOnline } from './db.js';
export { gapiLoaded, gisLoaded, handleAuthClick, handleSignoutClick, listFolder, getAccessToken };

// TODO(developer): Set to client ID and API key from the Developer Console
const CLIENT_ID = '497364576529-1njnp23inpkn6uaec07loo5227u476de.apps.googleusercontent.com';
const API_KEY = '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';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let accessToken;

document.getElementById('authorize_button').style.display = 'none';
document.getElementById('signout_button').style.display = 'none';

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
  if (isOnline) {
    gapi.load('client', initializeGapiClient);
  } else {
    unlockScreen();
  }
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiInited = true;
  maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
  if (isOnline) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      redirect_uri: 'https://luvca.bitbucket.io/fruit-basket',
      callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
  }
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    document.getElementById('authorize_button').style.display = 'inline';
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      throw (resp);
    }
    accessToken = gapi.client.getToken().access_token;
    //console.log(accessToken);
    document.getElementById('signout_button').style.display = 'inline';
    document.getElementById('authorize_button').innerText = 'Refresh';
    signInDatabase();
    unlockScreen();
  };

  if (gapi.client.getToken() === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({prompt: 'consent'});
  } else {
    // Skip display of account chooser and consent dialog for an existing session.
    tokenClient.requestAccessToken({prompt: ''});
  }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
    document.getElementById('content').innerText = '';
    document.getElementById('authorize_button').innerText = 'Authorize';
    document.getElementById('signout_button').style.display = 'none';
    $('#fb-humburger-button').attr('disabled', true);
    $('#main-area').addClass('d-none');
  }
}

/**
 * Print metadata for first 10 files.
 */
async function listFiles() {
  let response;
  try {
    response = await gapi.client.drive.files.list({
      'pageSize': 10,
      'fields': 'files(id, name)',
    });
  } catch (err) {
    document.getElementById('content').innerText = err.message;
    return;
  }
  const files = response.result.files;
  if (!files || files.length == 0) {
    document.getElementById('content').innerText = 'No files found.';
    return;
  }
  // Flatten to string to display
  const output = files.reduce(
      (str, file) => `${str}${file.name} (${file.id})\n`,
      'Files:\n');
  document.getElementById('content').innerText = output;
}

function getAccessToken() {
  return accessToken;
}

function listFolder(path) {
  var url = (path.length == 0) ? 'root' : path;
  console.log(url);
  return gapi.client.drive.files.list({
    'fields': "nextPageToken, files(id, name, modifiedTime, webContentLink, parents, mimeType, thumbnailLink)",
    'orderBy': 'name',
    'q': `"${url}" in parents`
  });
}

function unlockScreen() {
  $('#fb-humburger-button').attr('disabled', false);
  $('#main-area').removeClass('d-none');
}