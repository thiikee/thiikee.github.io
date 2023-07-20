export { getAlbums, setAlbums }

var albums = [];

(() => {
})();

function getAlbums() {
  return albums;
}

function setAlbums(snapshot) {
  snapshot.then((a) => {
    albums = a;
  });
}