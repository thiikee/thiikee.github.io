import { createWomenSelectSearch, createArtistsSelectSearch, createTagsSelectSearch } from './select-pure.js';
import { getTypes } from './types.js';
import { getAlbums } from './albums.js';
import { getWomen, getWomenAliases } from './women.js';
export { getSearchCriteria };

const $love = $('#fb-search-love');
const $title = $('#fb-search-title');
const $type = $('#fb-search-type');
const $album = $('#fb-search-album');
const $keeping = $('#fb-search-include-keeping');
const $discarded = $('#fb-search-include-discarded');
const $searchLimit = $('#fb-search-limit');
const $searchType = $('#fb-search-type');
const $searchAlbum = $('#fb-search-album');
const $searchLove = $('#fb-search-love');
const $searchHeart = $('#fb-search-heart');
const $ascending = $('#fb-search-ascending');
var initCriteria = false;

(() => {
  $('#fb-humburger-button').on('click', setupCriteria);
  $('#fb-search-heart').on('click', setLoveFilter);
})();

function setupCriteria() {
  if (initCriteria) return;
  if (getWomen().length == 0) return;
  createTypesSelect();
  createAlbumsSelect();
  createWomenSelectSearch();
  createArtistsSelectSearch();
  createTagsSelectSearch();
  initCriteria = true;
}

function getSearchCriteria() {
  //console.log(parseInt($searchLimit.val()));
  return {
    love: $love.val(),
    title: $title.val(),
    type: $type.val(),
    album: $album.val(),
    women: womenSelectSearch.value(),
    aliases: getWomenAliases(womenSelectSearch.value()),
    artists: artistsSelectSearch.value(),
    tags: tagsSelectSearch.value(),
    orderBy: $('input[name="fb-search-order-by"]:checked').val(),
    ascending: $ascending.prop('checked'),
    keeping: $keeping.prop('checked'),
    discarded: $discarded.prop('checked'),
    limit: parseInt($searchLimit.val())
  };
}

function createTypesSelect() {
  $searchType.empty();
  $searchType.append($('<option>').append(''));
  getTypes().forEach((v) => {
    //console.log(v);
    $($('<option>', {value: v.name}).append(v.name)).appendTo($searchType);
  });
}
function createAlbumsSelect() {
  $searchAlbum.empty();
  $searchAlbum.append($('<option>').append(''));
  getAlbums().forEach((v) => {
    //console.log(v);
    $($('<option>', {value: v.name}).append(v.name)).appendTo($searchAlbum);
  });
}

function setLoveFilter() {
  var love = $searchLove.val();
  if (love.length == 0) {
    $searchLove.val('love');
    $searchHeart.css('color', 'red').removeClass('far').addClass('fas');
  } else {
    $searchLove.val('');
    $searchHeart.css('color', 'gray').removeClass('fas').addClass('far');
  }
}