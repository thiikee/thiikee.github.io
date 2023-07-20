export { initForm };

(() => {
  $(document).on('click', '.fb-close-dialog', closeDialog);
})();

function initForm(form)
{
  $(form).find('textarea, :text, select').val('').end().find(':checked').prop('checked', false);
}

function closeDialog(event) {
  var dialog = $(event.target.closest('.modal'));
  $(dialog).modal('hide');
}