export { getTypes, setTypes }

var types = [];

(() => {
})();

function getTypes() {
  return types;
}

function setTypes(snapshot) {
  snapshot.then((t) => {
    types = t;
  });
}