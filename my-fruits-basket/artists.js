export { getArtists, setArtists, addArtist }

var artists = [];

(() => {
})();

function getArtists() {
  return artists;
}

function setArtists(snapshot) {
  snapshot.then((a) => {
    artists = a;
  });
}

function addArtist(artist) {
  artists.push(artist);
  artists.sort((a, b) => {
    return (a.yomi < b.yomi ? -1 : 1);
  });
}
