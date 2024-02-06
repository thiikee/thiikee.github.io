import { openEditDialog } from './edit-dialog.js';
import { getImage } from './authPopup.js';
export { createCard };

const $cardTemplate = $('#fb-card-template').prop('outerHTML');

(() => {
  $(document).on('slide.bs.carousel', '.carousel.lazy', lazyLoadImage);
  $(document).on('slid.bs.carousel', '.carousel.lazy', imageIndex);
  $(document).on('click', '.fb-edit-post-button', editPost);
  $(document).on('click', '.fb-view-post-button', viewCurrentImage);
  $(document).on('click', '.fb-google-title', googleSearch);
  $(document).on('click', '.fb-nyaa', nyaaSearch);
})();

function createCard(post, callback) {
  var card = $.parseHTML($cardTemplate);
  $(card).removeClass('d-none');
  if (post.discarded && post.discarded == 1) {
    var $cardBody = $(card).find('.card-body');
    $cardBody.css('background-color', 'silver');
  }
  $(card).attr('id', post.id);
  if (post.movie) {
    var $movie = $(card).find('.fb-post-movie');
    $movie.attr('src', `${post.movie}#t=${post.cover}`)
    $movie.attr('data-src', post.movie)
    $movie.removeClass('d-none');
  }
  var carouselId = `fb-post-carousel-${post.id}`;
  $(card).find('.fb-post-carousel').attr('id', carouselId);
  $(card).find('.fb-post-carousel-control').attr('href', `#${carouselId}`);
  var carouselItems = $(card).find('.fb-post-carousel-items');
  var carouselItemTemplate = $(card).find('.fb-post-carousel-item').prop('outerHTML');
  carouselItems.empty();
  if (post.imageIds && post.imageIds.length > 0) {
    post.imageIds.forEach((imageId, i, a) => {
      //console.log(imageId);
      var carouselItem = $.parseHTML(carouselItemTemplate);
      const imageIdReplace = imageId.replace('!', '-');
      $(carouselItem).attr('id', `carousel-item-${imageIdReplace}`);
      var $img = $(carouselItem).find('.fb-post-image');
      $img.attr('id', imageIdReplace);
      $img.attr('data-image-id', imageId);
      carouselItems.append($(carouselItem).prop('outerHTML'));
      getImage(imageId, (r) => {
        var u = r['@microsoft.graph.downloadUrl'];
        //console.log(imageId);
        //console.log(u);
        $(`#${imageIdReplace}`).attr('data-image-url', u);
        $(`carousel-item-${imageIdReplace}`).find('.fb-post-url').text(u);
        if (post.cover < a.length) {
          if (i == post.cover) {
            $(`#carousel-item-${imageIdReplace}`).addClass('active');
            $(`#${imageIdReplace}`).attr('src', u);
          } else {
            $(`#${imageIdReplace}`).attr('data-src', u);
          }
        } else {
          if (i == 0) {
            $(`#carousel-item-${imageIdReplace}`).addClass('active');
            $(`#${imageIdReplace}`).attr('src', u);
          } else {
            $(`#${imageIdReplace}`).attr('data-src', u);
          }
        }
      });
    });
  } else if (post.images) {
    carouselItems.append(post.images.map((u, i, a) => {
      //console.log(u);
      var carouselItem = $.parseHTML(carouselItemTemplate);
      var $img = $(carouselItem).find('.fb-post-image');
      $img.attr('data-image-url', u);
      $(carouselItem).find('.fb-post-url').text(u);
      if (post.cover < a.length) {
        if (i == post.cover) {
          $(carouselItem).addClass('active');
          $img.attr('src', u);
        } else {
          $img.attr('data-src', u);
        }
      } else {
        if (i == 0) {
          $(carouselItem).addClass('active');
          $img.attr('src', u);
        } else {
          $img.attr('data-src', u);
        }
      }
      return $(carouselItem).prop('outerHTML');
    }).join(''));
  }
  $(card).find('.fb-post-title').text(post.title);
  $(card).find('.fb-post-comment').text(post.comment);
  $(card).find('.fb-post-cover').text(post.cover);
  $(card).find('.fb-post-alt').text(post.alt);
  if (post.love) {
    $(card).find('.fb-post-love').removeClass('far').addClass('fas').css('color', 'red');
  } else {
    $(card).find('.fb-post-love').removeClass('fas').addClass('far').css('color', 'white');
  }
  $(card).find('.fb-post-type').text(post.type);
  createBadge(card, post.women, '.fb-post-women', '.fb-post-woman');
  createBadge(card, post.artists, '.fb-post-artists', '.fb-post-artist');
  createBadge(card, post.tags, '.fb-post-tags', '.fb-post-tag');
  createBadge(card, post.albums, '.fb-post-albums', '.fb-post-album');
  $(card).find('.fb-post-url-count').text(post.imageIds ? post.imageIds.length : 0);
  if (post.createdAt) {
    try {
      $(card).find('.fb-post-created-at').text(post.createdAt.toLocaleString('ja-JP').replace(/\//g, '-'));
      $(card).find('.fb-post-updated-at').text(post.updatedAt.toLocaleString('ja-JP').replace(/\//g, '-'));
    } catch {}
  }
  //console.log(post.id);
  $(card).find('.fb-post-id').text(post.id);
  callback(card);
}

function createBadge(card, items, areaClass, badgeClass) {
  if (items) {
    //console.log(items);
    var area = $(card).find(areaClass);
    var template = $(card).find(badgeClass).prop('outerHTML');
    items.forEach((e) => {
      var badge = $.parseHTML(template);
      $(badge).text(e);
      if (e === 'Nyaa' || e === 'MISSAV') {
        $(badge).addClass('fb-post-tag-nyaa');
      }
      $(area).append(badge);
    });
  }
}

function lazyLoadImage(event) {
  var lazy = $(event.relatedTarget).find('img[data-src]');
  //console.log($(lazy).data('src'));
  $(lazy).attr('src', $(lazy).data('src'));
  $(lazy).removeAttr('data-src');
}

function imageIndex(event) {
  var card = $(event.target.closest('.card'));
  var index = card.find('.fb-carousel-index');
  index.text($(event.relatedTarget).parent().parent().find('.fb-post-carousel-item.active').index());
}

function editPost(event) {
  openEditDialog(pickPost(event));
}

function viewCurrentImage(event) {
  var card = $(event.target.closest('.card'));
  var carousel = card.find('.fb-post-carousel');
  var item = carousel.find('.fb-post-carousel-item.active');
  var image = item.find('.fb-post-image');
  //console.log(image.attr('src'));
  window.open(`image.html?src=${image.attr('src')}`, '_blank');
}

function pickPost(event) {
  var card = $(event.target.closest('.card'));
  return {
    id: card.attr('id'),
    title: card.find('.fb-post-title').text(),
    type: card.find('.fb-post-type').text(),
    movie: card.find('.fb-post-movie').attr('data-src'),
    images: card.find('.fb-post-image').get().map((i) => {
      return {
        id: $(i).data('image-id'),
        url: $(i).data('image-url')
      }
    }),
    love: card.find('.fb-post-love').css('color') == 'rgb(255, 0, 0)',
    discarded: card.find('.card-body').css('background-color') == 'rgb(192, 192, 192)',
    women: card.find('.fb-post-woman').get().map((w) => $(w).text()),
    artists: card.find('.fb-post-artist').get().map((a) => $(a).text()),
    tags: card.find('.fb-post-tag').get().map((t) => $(t).text()),
    albums: card.find('.fb-post-album').get().map((a) => $(a).text()),
    comment: card.find('.fb-post-comment').text(),
    cover: card.find('.fb-post-cover').text(),
    alt: card.find('.fb-post-alt').text(),
    createdAt: card.find('.fb-post-created-at').text()
  };
}

function googleSearch(event) {
  //console.log('google');
  var post = pickPost(event);
  window.open(`https://www.google.co.jp/search?q=${post.title}+${post.women}`, '_blank');
};

function nyaaSearch(event) {
  var post = pickPost(event);
  var url = `https://sukebei.nyaa.si/?q=${post.title.replace(/ ?[0-9]+歳$/, '')}`;
  if (post.women.length == 1)
    url += `+${post.women}`;
  url += '&f=0&c=0_0';
  window.open(url, '_blank');
}