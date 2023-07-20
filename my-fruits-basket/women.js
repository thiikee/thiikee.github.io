export { getWomen, setWomen, addWoman, getWomenAliases, setWomenAliases };

var women = [];
var aliases = [];

(() => {
})();

function getWomen() {
  return women;
}

function setWomen(snapshot) {
  snapshot.then((w) => {
    women = w;
  });
}

function setWomenAliases(snapshot) {
  snapshot.then((a) => {
    aliases = a;
  });
}

function getWomenAliases(names) {
  var result = [];
  if (!names) return result;
  names.forEach((name) => {
    var a1 = aliases.filter(a => a.name == name).map(a => a.alias);
    var a2 = aliases.filter(a => a.alias == name).map(a => a.name);
    result = result.concat(a1.concat(a2));
  });
  return result;
}

function addWoman(woman) {
  women.push(woman);
  women.sort((a, b) => {
    return (a.yomi < b.yomi ? -1 : 1);
  });
}