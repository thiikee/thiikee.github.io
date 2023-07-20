import { initForm } from "./form.js";
import { saveArtist } from './db.js';
import { addArtist } from "./artists.js";
import { createArtistsSelectEdit, createArtistsSelectSearch, getSelectedEditArtists } from "./select-pure.js";
export { openArtistDialog };

const $artistDialog = $('#fb-artist-dialog');
const $artistForm = $('#fb-artist-form');

(() => {
  $('#fb-save-artist-button').on('click', saveButtonClick);
})();

function openArtistDialog(post) {
  initForm($artistDialog);
  $artistDialog.modal('show');
}

function saveButtonClick(event) {
  if ($artistForm.get(0).checkValidity() === true) {
    if (!confirm('OK ?')) return;
    var artist = pickArtist();
    saveArtist(artist);
    addArtist(artist);
    createArtistsSelectSearch();
    var artists = getSelectedEditArtists();
    artists.push(artist.name);
    createArtistsSelectEdit(artists);
    $artistDialog.modal('hide');
  } else {
    $artistForm.addClass('was-validated');
  }
}

function pickArtist() {
  return {
    name: $('#fb-artist-name').val(),
    yomi: $('#fb-artist-phonetic-name').val()
  }
}