import { createWomenSelectEdit,  createArtistsSelectEdit, createTagsSelectEdit, createAlbumsSelectEdit, getSelectedEditTags } from './select-pure.js';
import { createCard } from './card.js';
import { replaceCard } from './search-result.js';
import { savePost } from './db.js';
import { setOpacity } from './opacity.js';
import { openWomanDialog } from './woman-dialog.js';
import { openArtistDialog } from './artist-dialog.js';
import { openTagDialog } from './tag-dialog.js';
import { initForm } from './form.js';
import { listFolder, getLink } from './authPopup.js';
export { openEditDialog };

const $editDialog = $('#editDialog');
const $editForm = $('#editForm');
const $postUrls = $editDialog.find('#fb-post-urls');
const urlTemplate = $postUrls.html();
const $dropboxDialog = $('#fb-dropbox-dialog');
const $dropboxImages = $('#fb-dropbox-images');
const dropboxImageTemplate = $dropboxImages.html();

(() => {
  $('#fb-save-post-button').on('click', saveButtonClick);
  $('#fb-add-woman-button').on('click', addWomanClick);
  $('#fb-add-artist-button').on('click', addArtistClick);
  $('#fb-add-tag-button').on('click', addTagClick);
  $('#fb-post-heart').on('click', toggleLove);
  $('#fb-nyaa-button').on('click', addNyaa);
  $('#fb-add-url-button').on('click', addImageClick);
  $(document).on('click', '.fb-select-google-folder', selectGoogleFolder);
  $(document).on('click', '.fb-view-url-button', inputImageUrl);
  $(document).on('click', '.fb-up-url-button', upUrl);
  $(document).on('click', '.fb-down-url-button', downUrl);
  $(document).on('click', '.fb-delete-url-button', removeUrl);
  $('#fb-select-images-button').on('click', selectDropboxImages);
  $('#fb-toggle-all-images-select').on('click', toggleAllImagesSelect);
  //$('#fb-post-created-at-picker').datetimepicker();
})();

function openEditDialog(post) {
  initForm($editDialog);
  $editForm.removeClass('was-validated');
  $('#fb-post-heart').css('color', 'gray').removeClass('fas').addClass('far');
  if (post.id) {
    $('#editModalTitle').text('Edit');
  } else {
    $('#editModalTitle').text('Add');
  }
  // Id
  $editDialog.find('#fb-post-id').val(post.id);
  // Created at
  $editDialog.find('#fb-post-created-at').val(post.createdAt);
  // Images
  $postUrls.empty();
  post.images.forEach((i) => {
    var postUrl = $.parseHTML(urlTemplate);
    $(postUrl).find('.fb-post-url').attr('data-image-id', i.id);
    $(postUrl).find('.fb-post-url').attr('src', i.url);
    $postUrls.append(postUrl);
  });
  // Title
  $editDialog.find('#fb-post-title').val(post.title);
  // Type
  $('input:radio[name="fb-post-type"]').val([post.type]);
  // Love
  if (post.love) {
    $editDialog.find('#fb-post-love').val('love');
    $editDialog.find('#fb-post-heart').removeClass('far').addClass('fas').css('color', 'red');
  } else {
    $editDialog.find('#fb-post-love').val('');
    $editDialog.find('#fb-post-heart').removeClass('fas').addClass('far').css('color', 'gray');
  }
  if (post.discarded) {
    $editDialog.find('#fb-post-discarded').prop('checked', true);
  }
  // Badges
  createAlbumsSelectEdit(post.albums);
  createWomenSelectEdit(post.women);
  createArtistsSelectEdit(post.artists);
  createTagsSelectEdit(post.tags);
  // Comment
  $editDialog.find('#fb-post-comment').val(post.comment);
  // Alt
  $editDialog.find('#fb-post-alt').val(post.alt);
  $editDialog.find('#fb-post-cover').val(post.cover);
  // Delete button
  if (!post.id) {
    $('#fb-delete-post-button').addClass('d-none');
    $('#fb-post-individual-area').removeClass('d-none');
  } else {
    $('#fb-delete-post-button').removeClass('d-none');
    $('#fb-post-individual-area').addClass('d-none');
  }
  $editDialog.modal('show');
  setOpacity();
}

function saveButtonClick(event) {
  if ($editForm.get(0).checkValidity() === true) {
    if (!confirm('OK ?')) return;
    var post = pickPost(event);
    if (!post.individual) {
      savePost(post)
        .then((res) => {
          updateSearchResult(res);
        }, (error) => {
          alert(error);
        });
    } else {
      post.imageIds.forEach((u, i) => {
        var p = post;
        p.id = undefined;
        p.title = p.imageTitles[i];
        p.imageIds = [u];
        p.images = [];
        savePost(p)
          .then((res) => {
            updateSearchResult(res);
          }, (error) => {
            alert(error);
          });
      });
    }
    $editDialog.modal('hide');
  } else {
    $editForm.addClass('was-validated');
  }
}

function addImageClick() {
  //console.log('addImage');
  var postUrl = $.parseHTML(urlTemplate);
  $postUrls.append(postUrl);
}

function addWomanClick() {
  openWomanDialog();
}

function addArtistClick() {
  openArtistDialog();
}

function addTagClick() {
  openTagDialog();
}

function pickPost(event) {
  var dialog = $(event.target.closest('.modal'));
  var post = {
    id: dialog.find('#fb-post-id').val(),
    individual: $('#fb-post-individual:checked').val(),
    title: $('#fb-post-title').val(),
    type: dialog.find('input[name="fb-post-type"]:checked').val(),
    imageIds: dialog.find('.fb-post-url').get().map((u) => $(u).attr('data-image-id')),
    imageTitles: dialog.find('.fb-post-url').get().map((u) => $(u).attr('data-image-title')),
    images: dialog.find('.fb-post-url').get().map((u) => $(u).attr('src')).filter((u) => u.length > 0),
    videoUrl: dialog.find('.fb-movie').get().map((u) => $(u).attr('href')).filter((u) => u.length > 0),
    love: $('#fb-post-love').val() == 'love',
    women: womenSelectEdit.value(),
    artists: artistsSelectEdit.value(),
    tags: tagsSelectEdit.value(),
    albums: albumsSelectEdit.value(),
    comment: $('#fb-post-comment').val(),
    cover: $('#fb-post-cover').val(),
    alt: $('#fb-post-alt').val(),
    createdAt: $('#fb-post-created-at').val()
  };
  //console.log(post.imageIds);
  post.discarded = $('#fb-post-discarded:checked').val();
  if (!post.discarded) post.discarded = false;
  var createdAt = $('#fb-post-created-at').val();
  var now = new Date();
  if (createdAt.length > 0) {
      post.createdAt = new Date(Date.parse(createdAt.replace(/-/g, '/').replace(/T/, ' ').replace(/Z/, '')));
  } else {
      post.createdAt = now;
  }
  post.updatedAt = now;
  return post;
}

function updateSearchResult(post) {
  //console.log(post.id);
  createCard(post, function(card) {
    replaceCard(post.id, card);
    setOpacity();
  });
}

function selectGoogleFolder(event) {
  initForm($dropboxDialog);
  var folder = $(event.target).val();
  $('#fb-dropbox-title').val($(event.target).text());
  $dropboxImages.empty();
  //console.log(folder);
  listFolder(folder, (res) => {
    //console.log(res.value);
    res.value.forEach((item) => {
      if (item.folder) {
        //console.log(item);
        $dropboxImages.append(`
        <div class="card mb-2">
          <button type="button" class="btn btn-outline-info btn-block fb-select-google-folder" value="${item.id}">${item.name}</button>
        </div>`)
      } else {
        //console.log(item);
        if (item.file && item.file.mimeType.match(/image\/.+/i)) {
          var dropboxItem = $.parseHTML(dropboxImageTemplate);
          $dropboxImages.append(dropboxItem);
          var directUrl = item['@microsoft.graph.downloadUrl'];
          //var directUrl = item.thumbnailLink.replace(/=s[0-9]+$/, '=s0');
          $(dropboxItem).find('input[name="fb-dropbox-image"]').attr('value', directUrl);
          $(dropboxItem).find('.fb-dropbox-image').text(item.name.replace(/\.[^/.]+$/, ''));
          var $img = $(dropboxItem).find('img');
          $img.attr('src', directUrl);
          $img.attr('alt', item.lastModifiedDateTime);
          $img.attr('data-image-id', item.id);
          $img.attr('data-image-title', item.name.replace(/\.[^/.]+$/, ''));
        }
      }
    })
  });
  $dropboxDialog.modal('show');
  setOpacity();
}

function selectDropboxImages() {
  $dropboxDialog.find('input[name="fb-dropbox-image"]:checked').get().forEach((e, i, a) => {
    var postUrl = $.parseHTML(urlTemplate);
    var imageId = $(e).closest('.card').find('img').attr('data-image-id');
    var imageTitle = $(e).closest('.card').find('img').attr('data-image-title');
    var url = $(e).closest('.card').find('img').attr('src');
    $(postUrl).find('.fb-post-url').attr('data-image-id', imageId);
    $(postUrl).find('.fb-post-url').attr('data-image-title', imageTitle);
    $(postUrl).find('.fb-post-url').attr('src', url);
    if (i === 0) {
      if ($('#fb-post-title').val().length === 0) {
        if (a.length === 1) {
          $('#fb-post-title').val($(e).closest('.card').find('.fb-dropbox-image').text());
        } else {
          $('#fb-post-title').val($('#fb-dropbox-title').val());
        }
      }
      var createdAt = $(e).closest('.card').find('img').attr('alt');
      //console.log(createdAt);
      if (!$('#fb-post-created-at').val()) {
        $('#fb-post-created-at').val(createdAt);
      }
    }
    $postUrls.append(postUrl);
    setOpacity();
  });
  $dropboxDialog.modal('hide');
}

function toggleAllImagesSelect(event) {
  $('input[name="fb-dropbox-image"]').prop('checked', event.target.checked);
}

function inputImageUrl(event) {
  var img = $(event.target.closest('.fb-image-table')).find('img');
  var url = window.prompt("Input image URL.", img.attr('src'));
  if (url) img.attr('src', url);
  setOpacity();
};

function upUrl(event) {
  var src = event.target.closest('.fb-image-table');
  var srcImg = $(src).find('img');
  var srcImageId = srcImg.attr('data-image-id');
  var srcUrl = srcImg.attr('src');
  var dst = src.previousSibling.previousSibling;
  if (dst) {
    dst = dst.previousSibling;
    var dstImg = $(dst).find('img');
    var dstImageId = dstImg.attr('data-image-id');
    var dstUrl = dstImg.attr('src');
    dstImg.attr('data-image-id', srcImageId);
    dstImg.attr('src', srcUrl);
    srcImg.attr('data-image-id', dstImageId);
    srcImg.attr('src', dstUrl);
  }
}

function downUrl(event) {
  var src = event.target.closest('.fb-image-table');
  var srcImg = $(src).find('img');
  var srcImageId = srcImg.attr('data-image-id');
  var srcUrl = srcImg.attr('src');
  var dst = src.nextSibling.nextSibling;
  if (dst) {
    dst = dst.nextSibling;
    var dstImg = $(dst).find('img');
    var dstImageId = dstImg.attr('data-image-id');
    var dstUrl = dstImg.attr('src');
    dstImg.attr('data-image-id', srcImageId);
    dstImg.attr('src', srcUrl);
    srcImg.attr('data-image-id', dstImageId);
    srcImg.attr('src', dstUrl);
  }
}

function removeUrl(event) {
  var src = event.target.closest('.fb-image-table');
  $(src).remove();
}

function toggleLove(event) {
  var love = $('#fb-post-love').val();
  if (love.length == 0) {
    $('#fb-post-love').val('love');
    $('#fb-post-heart').css('color', 'red').removeClass('far').addClass('fas');
  } else {
    $('#fb-post-love').val('');
    $('#fb-post-heart').css('color', 'gray').removeClass('fas').addClass('far');
  }
}

function addNyaa() {
  var tags = getSelectedEditTags();
  tags.push('Nyaa');
  createTagsSelectEdit(tags);
}