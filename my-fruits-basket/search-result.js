export { setSearchResult, resetSearchResult, appendCard, replaceCard, lastVisible };
import { createCard } from './card.js';

var $resultArea = $('#search-result');
var $infoMessageArea = $('#info-msg-area');
var $readNextButton = $('#fb-read-next-button');
var bricklayer;
var lastVisible = 0;

function setSearchResult(posts) {
  //console.log(posts);
  createBrickLayer();
  if (posts.length === 0) {
    $infoMessageArea .append('No more posts.');
    $readNextButton.addClass('d-none');
  } else {
    lastVisible += posts.length;
    var divider = $('<div>');
    bricklayer.append(divider.get(0));
    posts.forEach((post) => {
      //console.log(post);
      createCard(post, function(card) {
        appendCard(card);
      });              
    });
    $('html,body').animate({ scrollTop: divider.offset().top });
    $readNextButton.removeClass('d-none');
  }
}

function resetSearchResult() {
  $resultArea.parent().scrollTop(0);
  $resultArea.empty();
  $infoMessageArea.empty();
  $readNextButton.addClass('d-none');
  lastVisible = 0;
  createBrickLayer(true);
}

function appendCard(card, single) {
  //console.log(card);
  createBrickLayer();
  if (single) {
    bricklayer.prepend(card);
  } else {
    bricklayer.append(card);
  }
}

function replaceCard(id, card) {
  //console.log(id);
  if (!id) {
    appendCard(card, true);
  } else {
    var current = $(`#${id}`);
    //console.log(current);
    if (current[0]) {
      //console.log(card);
      current.replaceWith(card);
    } else {
      appendCard(card, true);
    }
  }
}

function createBrickLayer(force) {
  if (!bricklayer || force) bricklayer = new Bricklayer(document.querySelector('.bricklayer'));
}