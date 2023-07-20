import { getAlbums } from "./albums.js";
import { getWomen } from './women.js';
import { getArtists } from "./artists.js";
import { getTags } from "./tags.js";
export { createWomenSelectSearch, createArtistsSelectSearch, createTagsSelectSearch,
  createAlbumsSelectEdit, createWomenSelectEdit, createArtistsSelectEdit, createTagsSelectEdit,
  getSelectedEditWomen, getSelectedEditArtists, getSelectedEditTags };

const $womenSelectSearch = $('#fb-post-women-search');
const $artistsSelectSearch = $('#fb-post-artists-search');
const $tagsSelectSearch = $('#fb-post-tags-search');
const $albumsSelectEdit = $('#fb-post-albums');
const $womenSelectEdit = $('#fb-post-women');
const $artistsSelectEdit = $('#fb-post-artists');
const $tagsSelectEdit = $('#fb-post-tags');

(() => {
  $(document).on('DOMSubtreeModified', '.select-pure__select', selectPureSelectd);
})();

function createWomenSelectSearch() {
  $womenSelectSearch.text('');
  var options = getWomen().map((w) => {return { label: w.name, value: w.name }});
  womenSelectSearch = new SelectPure($womenSelectSearch[0], {
    options: options,
    multiple: true,
    icon: 'fa fa-times'
  });
}

async function createArtistsSelectSearch() {
  $artistsSelectSearch.text('');
  var options = getArtists().map((a) => {return { label: a.name, value: a.name }});
  artistsSelectSearch = new SelectPure($artistsSelectSearch[0], {
    options: options,
    multiple: true,
    icon: 'fa fa-times'
  });
}

async function createTagsSelectSearch() {
  $tagsSelectSearch.text('');
  var options = getTags().map((t) => {return { label: t.name, value: t.name }});
  tagsSelectSearch = new SelectPure($tagsSelectSearch[0], {
    options: options,
    multiple: true,
    icon: 'fa fa-times'
  });
}

async function createAlbumsSelectEdit(values) {
  $albumsSelectEdit.text('');
  var options = getAlbums().map((a) => {return { label: a.name, value: a.name }});
  albumsSelectEdit = new SelectPure($albumsSelectEdit[0], {
    options: options,
    multiple: true,
    icon: 'fa fa-times',
    value: intersect(values, options.map((e) => e.label))
  });
}

async function createWomenSelectEdit(values) {
  $womenSelectEdit.text('');
  var options = getWomen().map((w) => {return { label: w.name, value: w.name }});
  womenSelectEdit = new SelectPure($womenSelectEdit[0], {
    options: options,
    multiple: true,
    icon: 'fa fa-times',
    value: intersect(values, options.map((e) => e.label))
  });
}

async function createArtistsSelectEdit(values) {
  $artistsSelectEdit.text('');
  var options = getArtists().map((a) => {return { label: a.name, value: a.name }});
  artistsSelectEdit = new SelectPure($artistsSelectEdit[0], {
    options: options,
    multiple: true,
    icon: 'fa fa-times',
    value: intersect(values, options.map((e) => e.label))
  });
}

async function createTagsSelectEdit(values) {
  $tagsSelectEdit.text('');
  var options = getTags().map((t) => {return { label: t.name, value: t.name }});
  tagsSelectEdit = new SelectPure($tagsSelectEdit[0], {
    options: options,
    multiple: true,
    icon: 'fa fa-times',
    value: intersect(values, options.map((e) => e.label))
  });
}

function getSelectedEditWomen() {
  return womenSelectEdit.value();
}

function getSelectedEditArtists() {
  return artistsSelectEdit.value();
}

function getSelectedEditTags() {
  return tagsSelectEdit.value();
}

function intersect(a, b) {
  var setA = new Set(a);
  var setB = new Set(b);
  return Array.from(new Set([...setA].filter(e => (setB.has(e)))));
}

function selectPureSelectd() {
}