export { setOpacity, toggleOpacity };

var opacity = 0;

function setOpacity() {
  var mod = opacity % 2;
  //console.log(mod);
  if (mod === 0) {
    $('img').css({'opacity': '0.1'});
  } else if (mod === 1) {
    $('img').css({'opacity': '1'});
  }
}

function toggleOpacity() {
  opacity++;
  setOpacity();
}
