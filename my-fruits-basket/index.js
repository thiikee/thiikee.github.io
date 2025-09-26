import { getSearchCriteria } from './search-criteria.js';
import { setSearchResult, resetSearchResult, lastVisible } from './search-result.js';
import { getPosts } from './db.js';
import { openEditDialog } from './edit-dialog.js';
import { setOpacity, toggleOpacity } from './opacity.js';

var inProgress = false;

$(() => {
  $('#fb-search-posts-button').on('click', {reset: true}, searchPosts);
  $('#fb-clear-posts-button').on('click', false, reset);
  $('#fb-debug-button').on('click', false, debug);
  $('#fb-read-next-button').on('click', {reset: false}, searchPosts);
  $('#fb-add-post-button').on('click', false, addPost);
  $(document).on('click', '.fb-set-opacity',toggleOpacity);
  $(document).on('click', '.fb-back-to-top', backToTop);
});

function debug() {
  alert('debug');
}

function searchPosts(event) {
  //if (inProgress) return;
  //inProgress = true;
  if (event.data.reset) resetSearchResult();
  //showProgress();
  var criteria = getSearchCriteria();
  getPosts(criteria, lastVisible, (posts) => {
    //console.log(posts);
    setSearchResult(posts);
    setOpacity();
    //inProgress = false;
    //hideProgress();
  });
}

function addPost() {
  openEditDialog({
      images: []
  });
}

function showProgress() {
}

function hideProgress() {
}

function reset() {
  resetSearchResult();
}

function backToTop() {
  $('body, html').scrollTop(0);
}