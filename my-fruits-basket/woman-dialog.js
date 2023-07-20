import { initForm } from "./form.js";
import { saveWoman } from './db.js';
import { addWoman } from './women.js';
import { createWomenSelectEdit, createWomenSelectSearch, getSelectedEditWomen } from "./select-pure.js";
export { openWomanDialog };

const $womanDialog = $('#fb-woman-dialog');
const $womanForm = $('#fb-woman-form');

(() => {
  $('#fb-save-woman-button').on('click', saveButtonClick);
})();

function openWomanDialog(post) {
  initForm($womanDialog);
  $womanDialog.modal('show');
}

function saveButtonClick(event) {
  if ($womanForm.get(0).checkValidity() === true) {
    if (!confirm('OK ?')) return;
    var woman = pickWoman();
    saveWoman(woman);
    addWoman(woman);
    createWomenSelectSearch();
    var women = getSelectedEditWomen();
    women.push(woman.name);
    createWomenSelectEdit(women);
    $womanDialog.modal('hide');
  } else {
    $womanForm.addClass('was-validated');
  }
}

function pickWoman() {
  return {
    name: $('#fb-woman-name').val(),
    yomi: $('#fb-woman-phonetic-name').val()
  }
}