import { initForm } from "./form.js";
import { saveTag } from './db.js';
import { addTag } from "./tags.js";
import { createTagsSelectEdit, createTagsSelectSearch, getSelectedEditTags } from "./select-pure.js";
export { openTagDialog };

const $tagDialog = $('#fb-tag-dialog');
const $tagForm = $('#fb-tag-form');

(() => {
  $('#fb-save-tag-button').on('click', saveButtonClick);
})();

function openTagDialog(post) {
  initForm($tagDialog);
  $tagDialog.modal('show');
}

function saveButtonClick(event) {
  if ($tagForm.get(0).checkValidity() === true) {
    if (!confirm('OK ?')) return;
    var tag = pickTag();
    saveTag(tag);
    addTag(tag);
    createTagsSelectSearch();
    var tags = getSelectedEditTags();
    tags.push(tag.name);
    createTagsSelectEdit(tags);
    $tagDialog.modal('hide');
  } else {
    $tagForm.addClass('was-validated');
  }
}

function pickTag() {
  return {
    name: $('#fb-tag-name').val(),
    yomi: $('#fb-tag-phonetic-name').val()
  }
}