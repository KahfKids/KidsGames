/* 2048 game manager: the merge rules. Based on 2048 by Gabriele Cirulli (MIT licence, see LICENSE.txt).
   Kahf Kids changes: no DOM, input or storage here (game.js does that). Boards can be 3x3 or 4x4, start
   with given tiles, and hold fixed garden stones. move() reports what happened so game.js can animate it,
   and snapshot()/restore() give the Undo button its history. The sliding and merging rules are unchanged. */
function GameManager(size, opts) {
  opts = opts || {};
  this.size       = size; // Size of the grid
  this.startTiles = opts.startTiles == null ? 2 : opts.startTiles;
  this.fourChance = opts.fourChance == null ? 0.1 : opts.fourChance;
  this.setup(opts);
}

// Set up the game
GameManager.prototype.setup = function (opts) {
  var self = this;
  opts = opts || {};
  this.grid  = new Grid(this.size);
  this.score = 0;
  this.over  = false;

  (opts.stones || []).forEach(function (p) { self.grid.insertTile(new Tile(p, 0, true)); });
  (opts.start || []).forEach(function (t) {
    var cell = t.x != null ? { x: t.x, y: t.y } : self.grid.randomAvailableCell();
    if (cell && self.grid.cellAvailable(cell)) self.grid.insertTile(new Tile(cell, t.value));
  });
  this.addStartTiles();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 1 - this.fourChance ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
    return tile;
  }
  return null;
};

// Represent the current game as an object (used for Undo and for resuming a level)
GameManager.prototype.snapshot = function () {
  return { grid: this.grid.serialize(), score: this.score, over: this.over };
};
GameManager.prototype.restore = function (s) {
  this.grid  = new Grid(s.grid.size, s.grid.cells);
  this.size  = s.grid.size;
  this.score = s.score;
  this.over  = s.over;
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction.
// Returns { moved, merges: [merged tiles], spawned: tile or null, gained: score }.
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;
  var result = { moved: false, merges: [], spawned: null, gained: 0 };

  if (this.over) return result; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile && !tile.stone) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && !next.stone && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;
          result.gained += merged.value;
          result.merges.push(merged);
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    result.moved = true;
    result.spawned = this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // No moves left
    }
  }
  return result;
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile && !tile.stone) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && !other.stone && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

// Biggest tile on the board
GameManager.prototype.maxValue = function () {
  var m = 0;
  this.grid.eachCell(function (x, y, t) { if (t && t.value > m) m = t.value; });
  return m;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
