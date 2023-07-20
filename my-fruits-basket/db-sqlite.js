import { setAlbums } from './albums.js';
import { setArtists } from './artists.js';
import { setTags } from './tags.js';
import { setTypes } from './types.js';
import { setWomen, setWomenAliases } from './women.js';
export { getPosts, getAllTypes, getAllAlbums, getAllWomen, getAllAliases, getAllArtists, getAllTags,
  savePost, saveWoman, saveArtist, saveTag, signInDatabase, isOnline };

const isOnline = false;

(() => {
  setTypes(getAllTypes());
  setAlbums(getAllAlbums());
  setWomen(getAllWomen());
  setWomenAliases(getAllAliases());
  setArtists(getAllArtists());
  setTags(getAllTags());
})();

function getPosts(criteria, lastVisible, callback) {
  var params = [];
  if (criteria.title.length > 0) params.push(`title=${criteria.title}`);
  if (criteria.type.length > 0) params.push(`type=${criteria.type}`);
  if (criteria.women && criteria.women.length > 0) params.push(`women=${criteria.women.join()}`);
  if (criteria.artists && criteria.artists.length > 0) params.push(`artists=${criteria.artists.join()}`);
  if (criteria.tags && criteria.tags.length > 0) params.push(`tags=${criteria.tags.join()}`);
  if (criteria.album && criteria.album.length > 0) params.push(`album=${criteria.album}`);
  //console.log('love=' + criteria.love);
  if (criteria.love.length > 0) params.push('love=1');
  params.push(`offset=${lastVisible}`)
  params.push(`limit=${criteria.limit}`);
  params.push(`orderBy=${criteria.orderBy}`);
  if (criteria.keeping) params.push('keeping=1');
  if (criteria.discarded) params.push('discarded=1');
  if (criteria.ascending) params.push('ascending=1');
  var queryString = '';
  if (params.length > 0) queryString = `?${params.join('&')}`;
  //console.log(queryString);
  $.getJSON('/api/v1/posts' + queryString, (posts) => {
    callback(posts.map((p) => {
      return {
        id: p.id,
        title: p.title,
        type: p.type,
        images: p.images,
        women: JSON.parse(p.women),
        artists: JSON.parse(p.artists),
        tags: JSON.parse(p.tags),
        albums: JSON.parse(p.albums),
        videoUrl: [],
        comment: p.comment,
        love: p.love,
        discarded: p.discarded,
        alt: p.alt,
        createdAt: new Date(p.createdAt * 1000),
        updatedAt: new Date(p.updatedAt * 1000)
      };
    }));
  });
}

async function getImages(name, type) {
  var snapshot = await $.getJSON(`/api/v1/images${name}?type=${type}`);
  return snapshot;
}

async function getAllTypes() {
  var snapshot = await $.getJSON('/api/v1/types');
  return snapshot;
}

async function getAllAlbums() {
  var snapshot = await $.getJSON('/api/v1/albums');
  return snapshot;
}

async function getAllWomen() {
  var snapshot = await $.getJSON('/api/v1/women');
  return snapshot.map((w) => {
    return {
      name: w.name,
      yomi: w.phoneticName
    };
  });
}

async function getAllAliases() {
  var snapshot = await $.getJSON('/api/v1/aliases');
  return snapshot.map((a) => {
    return {
      name: a.name,
      alias: a.alias
    };
  });
}

async function getAllArtists() {
  var snapshot = await $.getJSON('/api/v1/artists');
  return snapshot.map((a) => {
    return {
      name: a.name,
      yomi: a.phoneticName
    };
  });
}

async function getAllTags() {
  var snapshot = await $.getJSON('/api/v1/tags');
  return snapshot.map((t) => {
    return {
      name: t.name,
      yomi: t.phoneticName
    };
  });
}

function savePost(post) {
  //console.log(post);
  if (!post.createdAt) {
    post.createdAt = new Date();
  }
  post.updatedAt = new Date();
  return new Promise((resolve) => {
    $.post('/api/v1/post', post, (res) => {
      //console.log(res);
      resolve(res);
    });
  });
}

function saveWoman(woman) {
  $.post('/api/v1/woman', {
    name: woman.name,
    phoneticName: woman.yomi
  });
}

function saveArtist(artist) {
  $.post('/api/v1/artist', {
    name: artist.name,
    phoneticName: artist.yomi
  });
}

function saveTag(tag) {
  $.post('/api/v1/tag', {
    name: tag.name,
    phoneticName: tag.yomi
  });
}

function signInDatabase() {}