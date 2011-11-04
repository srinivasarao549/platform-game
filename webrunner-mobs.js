const GOING_LEFT = 0;
const GOING_RIGHT = 1;
const STAND_STILL = 2;

function Mob(filename, x, y, width, height, animate) {
  if (filename) {
    this.boxInit(x, y, width, height);
    this.mobInit(filename, animate);
  }
}
Mob.prototype = {
  imgLoaded: false,
  dead: false,

  // Stats (could be modified by powerups):
  topSpeed: 122,
  gravity: 5,
  acceleration: 2, // make this 3 for a much easier to steer dude
  friction: 4,
  jumpPower: 30,

  mobInit: function(filename, animate) {
    var self = this;
    this.img = new Image();
    this.img.onload = function() {
      self.imgLoaded = true;
    };
    this.img.src = filename;

    this.vx = 0;
    this.vy = 0;

    this.isAnimated = animate;
    if (animate) {
	this.animationFrame = 0;
	this.movementDirection = STAND_STILL;
    }
  },

  draw: function(ctx) {
    if (this.imgLoaded) {
      if (this.isAnimated) {
        var spriteOffsetX = this.width * this.animationFrame;
        var spriteOffsetY = this.height * this.movementDirection;
        ctx.drawImage(this.img, spriteOffsetX, spriteOffsetY, this.width, this.height,
                      this.left, this.top, this.width, this.height);
      } else {
        ctx.drawImage(this.img, this.left, this.top);
      }
    } else {
	// if img not loaded yet, draw an empty box
	ctx.strokeStyle = "black";
	ctx.strokeRect(this.left, this.top, this.width, this.height);
    }
  },

  erase: function(ctx) {
    ctx.clearRect(this.left, this.top, this.width, this.height);
  },

  move: function(dx, dy) {
    this.jumping = false;
    if (dx == 0 && dy == 0 ) {
      this.animationFrame = 0;
      this.movementDirection = STAND_STILL;
    } else {
      this.animationFrame = (this.animationFrame + 1) % 5;
      if (dx <= 0) {
        this.movementDirection = GOING_LEFT;
      }
      if (dx > 0) {
        this.movementDirection = GOING_RIGHT;
      }
      this.left += dx;
      this.top += dy;
    }
  },

  onGround: function() {
    // is something under my feet?
    return TheWorld.touchingPlatform(this, "bottom");
  },

  stopAt: function(intercept) {
      // case where we hit a solid object before moving full velocity:
      // set location adjacent to it and cancel velocity in that
      // direction.

      switch (intercept.side) {
      case "top":
        this.vy = 0;
        this.left = intercept.x;
        this.top = intercept.y - this.height;
        break;
      case "left":
        this.vx = 0;
        this.left = intercept.x - this.width;
        this.top = intercept.y;
      playSfx("bonk-sfx")
        break;
      case "right":
        this.vx = 0;
        this.left = intercept.x;
        this.top = intercept.y;
      playSfx("bonk-sfx")
        break;
      case "bottom":
        this.vy = 0;
        this.left = intercept.x;
        this.top = intercept.y;
      playSfx("bonk-sfx")
        break;
      }	
  },

  update: function(ticks) {
    // Gravity:
    if (!this.onGround()) {
      this.vy += this.gravity;
    }

    // Collision detection
    var pathModified = TheWorld.detectPlatformIntercept(this);
    
    if (!pathModified) {
	// If no collision, move full velocity
	this.move(this.vx, this.vy);
    }
  },

  jump: function() {
    // Only jump if there is ground under me and nothing blocking
    // my head.
    if (this.onGround() && !this.jumping &&
        ! TheWorld.touchingPlatform(this, "top")) {
	playSfx("jump-sfx");
      this.vy -= this.jumpPower;
      this.jumping = true; // to make jump idempotent, fix bug 2
    }
  },

  idle: function() {
    // Apply friction if touching ground:
    if (this.onGround()) {
      if (this.vx > 0) {
        this.vx -= this.friction;
        if (this.vx < 0) {
          this.vx = 0;
        }
      }

      if (this.vx < 0) {
        this.vx += this.friction;
        if (this.vx > 0) {
          this.vx = 0;
        }
      }
    }
  },

  goLeft: function() {
    if (! TheWorld.touchingPlatform(this, "left")) {
      if (this.vx > 0 - this.topSpeed) {
        this.vx -= this.acceleration;
      } else {
        this.vx = 0 - this.topSpeed;
      }
    }
  },

  goRight: function() {
    if (! TheWorld.touchingPlatform(this, "right")) {
      if (this.vx < this.topSpeed) {
        this.vx += this.acceleration;
      } else {
        this.vx = this.topSpeed;
      }
    }
  },

  die: function() {
	this.dead = true;
  }
};
Mob.prototype.__proto__ = new Box();


function Player(filename, x, y, width, height) {
  this.mobInit(filename, true);
  this.boxInit(x, y, width, height);
}
Player.prototype = {
  type: "player",

  onMobTouch: function(mob, intercept) {
	// So this is kind of weird.
	// When i touch a monster it might call my onMobTouch method and pass
	// in the monster, or it might call the monster's onMobTouch method
	// and pass in me.  I want it to do the same thing either way.
	// So reflect it back:
	switch (intercept.side) {
	case "top": intercept.side = "bottom";
	break;
	case "bottom": intercept.side = "top";
	break;
	case "left": intercept.side = "right";
	break;
	case "right": intercept.side = "left";
	break;
	}
	mob.onMobTouch(this, intercept);
    }
}
Player.prototype.__proto__ = new Mob();


function Enemy() {
  this.mobInit("shrimp.gif", false);
  this.direction = "left";
}
Enemy.prototype = {
  type: "shrimp",
  width: 91,
  height: 49,

  roam: function() {
    if (this.direction == "left" && TheWorld.touchingPlatform(this, "left")) {
	this.direction = "right";
    } else if (this.direction == "right" && TheWorld.touchingPlatform(this, "right")) {
	this.direction = "left";
    }

    if (this.direction == "left") {
	this.goLeft();
    } else if (this.direction == "right") {
	this.goRight();
    }
  },
  onMobTouch: function(mob, intercept) {
    // If touch player, hurt player if touching from the
    // side; kill enemy if player jumps on its head.
    if (mob.type == "player") {
	if (intercept.side == "top") {
	    this.die();
	    // TODO death animation?
	    mob.vy = -10; // bounce
	    playSfx("crunch-sfx");
        } else {
	    mob.die();
	}
    }
    // TODO return true or false? stop mob at intercept?
  },
  substantial: function(side) {
	return true;
    }
};
Enemy.prototype.__proto__ = new Mob();
ConstructorRegistry.register(Enemy);

