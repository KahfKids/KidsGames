/* 2048 tile. Based on 2048 by Gabriele Cirulli (MIT licence, see LICENSE.txt).
   Kahf Kids changes: every tile has an id (for slide animations) and a tile can be a fixed stone. */
var TILE_ID = 0;

function Tile(position, value, stone) {
  this.id               = ++TILE_ID;
  this.x                = position.x;
  this.y                = position.y;
  this.stone            = !!stone;          // a garden stone: never moves, never merges
  this.value            = this.stone ? 0 : (value || 2);

  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y };
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
};

Tile.prototype.serialize = function () {
  return {
    position: {
      x: this.x,
      y: this.y
    },
    value: this.value,
    stone: this.stone || undefined
  };
};
