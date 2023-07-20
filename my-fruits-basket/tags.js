export { getTags, setTags, addTag }

var tags = [];

(() => {
})();

function getTags() {
  return tags;
}

function setTags(snapshot) {
  snapshot.then((t) => {
    tags = t;
  });
}

function addTag(tag) {
  tags.push(tag);
  tags.sort((a, b) => {
    return (a.yomi < b.yomi ? -1 : 1);
  });
}