(function () {
  var allCards = [];
  var heroBox = null;
  var cursor = null;
  var frameId = null;
 
  function findHovered() {
    if (!cursor) return;
 
    var cursorBox = cursor.getBoundingClientRect();
    var cx = cursorBox.left + cursorBox.width / 2;
    var cy = cursorBox.top + cursorBox.height / 2;
 
    for (var i = 0; i < allCards.length; i++) {
      var box = allCards[i].getBoundingClientRect();
      var isOver = cx >= box.left && cx <= box.right && cy >= box.top && cy <= box.bottom;
      allCards[i].classList.toggle('virtual-hover', isOver);
    }
 
    if (heroBox) {
      var hBox = heroBox.getBoundingClientRect();
      var overHero = cx >= hBox.left && cx <= hBox.right && cy >= hBox.top && cy <= hBox.bottom;
      heroBox.classList.toggle('virtual-hover', overHero);
    }
 
    frameId = requestAnimationFrame(findHovered);
  }
 
  function setup() {
    cursor = document.getElementById('virtualCursor');
    allCards = Array.from(document.querySelectorAll('.card, .collection-feature, .explore-card'));
    heroBox = document.querySelector('.hero-art');
 
    if (frameId) cancelAnimationFrame(frameId);
    findHovered();
  }
 
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
