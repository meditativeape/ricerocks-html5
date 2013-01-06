/** 
	Code below is from Three.js, and sourced from links below

    http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

    requestAnimationFrame polyfill by Erik Möller
    fixes from Paul Irish and Tino Zijdel
 **/

( function () {

    var lastTime = 0;
    var vendors = [ 'ms', 'moz', 'webkit', 'o' ];

    for ( var x = 0; x < vendors.length && !window.requestAnimationFrame; ++ x ) {
        window.requestAnimationFrame = window[ vendors[ x ] + 'RequestAnimationFrame' ];
        window.cancelAnimationFrame = window[ vendors[ x ] + 'CancelAnimationFrame' ] || window[ vendors[ x ] + 'CancelRequestAnimationFrame' ];
    }

    if ( !window.requestAnimationFrame ) {
        window.requestAnimationFrame = function ( callback, element ) {
            var currTime = Date.now(), timeToCall = Math.max( 0, frame_time - ( currTime - lastTime ) );
            var id = window.setTimeout( function() { callback( currTime + timeToCall ); }, timeToCall );
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if ( !window.cancelAnimationFrame ) {
        window.cancelAnimationFrame = function ( id ) { clearTimeout( id ); };
    }

}() );

/* Some constants used in game. */

var GAME_CONSTANTS = {
	num_lives: 3,
	friction: 0.03,
	ship_acc: 0.3,
	ship_angle_vel: 0.05,
	missile_vel: 6,
	score_per_rock: 10,
	ship_respawn_dist: 110,
	rock_upgrade_per_score: 0.01,
	files_to_load: 11,
	files_loaded: 0,
	game_width: 800,
	game_height: 600,
	frame_time: 60/1000
};

/** 
	Class to store information about an image.
	In parameters, only size is required. radius is 0 by default.
	lifespan is infinite (represented by NaN) by default. animated is false by default.
 **/

var Image_info = function(size, radius, lifespan, animated) {
	this.size = size;
	this.radius = radius || 0;
	if (lifespan) {
		this.lifespan = lifespan;
	} else {
		this.lifespan = NaN;
	}
	this.animated = animated || false;
};

/**
	Game assets, including images and sounds. 
	This should be loaded before the game runs by calling load_assets function.
 **/

var GAME_ASSETS = {
	debris_info: new Image_info([640, 480]),
	nebula_info: new Image_info([800, 600]),
	splash_info: new Image_info([400, 300]),
	ship_info: new Image_info([90, 90], 35),
	missile_info: new Image_info([10, 10], 3, 50),
	asteroid_info: new Image_info([90, 90], 40),
	explosion_info: new Image_info([128, 128], 17, 24, true)
};

/* Code copied from http://stackoverflow.com/questions/5313646/how-to-preload-a-sound-in-javascript */

var load_assets = function() {
	
	var load_image = function(url) {
		var img = new Image();
		img.onload = isAppLoaded;
		img.src = url;
		return img;
	};
	
	var load_audio = function(url) {
		var audio = new Audio();
		audio.addEventListener('canplaythrough', isAppLoaded, false);
		audio.src = url;
		return audio;
	};
	
	function isAppLoaded() {
		GAME_CONSTANTS.files_loaded++;
		if (GAME_CONSTANTS.files_loaded >= GAME_CONSTANTS.files_to_load) {
			main();
		}
	}
	
	// Art assets created by Kim Lathrop, may be freely re-used in non-commercial projects, please credit Kim
	
	GAME_ASSETS.debris_image = load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/debris2_blue.png");
	GAME_ASSETS.nebula_image = load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/nebula_blue.png");
	GAME_ASSETS.splash_image = load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/splash.png");
	GAME_ASSETS.ship_image = load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/double_ship.png");
	GAME_ASSETS.missile_image = load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/shot2.png");
	GAME_ASSETS.asteroid_image = load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/asteroid_blue.png");
	GAME_ASSETS.explosion_image = load_image("http://commondatastorage.googleapis.com/codeskulptor-assets/lathrop/explosion_alpha.png");
	
	GAME_ASSETS.soundtrack = load_audio("http://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/soundtrack.mp3");
	GAME_ASSETS.missile_sound = load_audio("http://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/missile.mp3");
	GAME_ASSETS.ship_thrust_sound = load_audio("http://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/thrust.mp3");
	GAME_ASSETS.explosion_sound = load_audio("http://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/explosion.mp3");
	
};

/* Ship class. */
	
var Ship = function(pos, vel, angle) {
	this.pos = [pos[0], pos[1]];
	this.vel = [vel[0], vel[1]];
	this.thrust = false;
	this.angle = angle;
	this.angle_vel = 0;
	this.image = GAME_ASSETS.ship_image;
	this.image_size = GAME_ASSETS.ship_info.size;
	this.radius = GAME_ASSETS.ship_info.radius;
};

Ship.prototype.draw = function() {
	if (this.thrust) {
		game.rotate_image_and_draw(GAME_ASSETS.ship_image, [this.image_size[0], 0],
			this.image_size, this.pos, this.image_size, this.angle);
	} else {
		game.rotate_image_and_draw(GAME_ASSETS.ship_image, [0, 0], this.image_size, 
			this.pos, this.image_size, this.angle);
	}
};

Ship.prototype.update = function() {
	// update angle
	this.angle += this.angle_vel;
	
	// update position
	var i = (this.pos[0] + this.vel[0]) % GAME_CONSTANTS.game_width;
	if (i < 0)  // -1 % 5 is 4 in Python, but is -1 in JavaScript!
		i = GAME_CONSTANTS.game_width - i;
	this.pos[0] = i;
	i = (this.pos[1] + this.vel[1]) % GAME_CONSTANTS.game_height;
	if (i < 0)
		i = GAME_CONSTANTS.game_height - i;
	this.pos[1] = i;
	
	// update velocity
	if (this.thrust) {
		var acc = game.angle_to_vector(this.angle);
		this.vel[0] += acc[0] * GAME_CONSTANTS.ship_acc;
		this.vel[1] += acc[1] * GAME_CONSTANTS.ship_acc;
	}
	
	this.vel[0] *= (1 - GAME_CONSTANTS.friction);
	this.vel[1] *= (1 - GAME_CONSTANTS.friction);
};

Ship.prototype.set_thrust = function(on) {
	this.thrust = on;
	if (on) {
		GAME_ASSETS.ship_thrust_sound.currentTime = 0;
		GAME_ASSETS.ship_thrust_sound.play();
	} else {
		GAME_ASSETS.ship_thrust_sound.pause();
	}
};

Ship.prototype.increment_angle_vel = function() {
	this.angle_vel += GAME_CONSTANTS.ship_angle_vel;
}

Ship.prototype.decrement_angle_vel = function() {
	this.angle_vel -= GAME_CONSTANTS.ship_angle_vel;
};

Ship.prototype.shoot = function() {
	var vel = game.angle_to_vector(this.angle);
	var pos = [this.pos[0], this.pos[1]];
	var size = GAME_ASSETS.ship_info.size;
	pos[0] += size[0] / 2 + vel[0] * this.radius;
	pos[1] += size[1] / 2 + vel[1] * this.radius;
	vel[0] = this.vel[0] + (vel[0] * GAME_CONSTANTS.missile_vel);
	vel[1] = this.vel[1] + (vel[1] * GAME_CONSTANTS.missile_vel);
	var m = new Sprite(pos, vel, this.angle, 0, GAME_ASSETS.missile_image,
		GAME_ASSETS.missile_info, GAME_ASSETS.missile_sound);
	game.missile_group.add(m);
};

/* Sprite class */ 
	
var Sprite = function(pos, vel, ang, ang_vel, image, info, sound) {
	this.pos = [pos[0], pos[1]];
	this.vel = [vel[0], vel[1]];
	this.angle = ang;
	this.angle_vel = ang_vel;
	this.image = image;
	this.image_size = info.size;
	this.radius = info.radius;
	this.lifespan = info.lifespan;
	this.animated = info.animated;
	this.age = 0;
	if (sound) {
		sound.currentTime = 0;
		sound.play();
	}
};

Sprite.prototype.draw = function() {
	if (this.animated) {
		game.rotate_image_and_draw(this.image, [this.age * this.image_size[0], 0],
			this.image_size, this.pos, this.image_size, this.angle);
	} else {
		game.rotate_image_and_draw(this.image, [0, 0], this.image_size, 
			this.pos, this.image_size, this.angle);
	}
};

Sprite.prototype.update = function() {
	// update angle
	this.angle += this.angle_vel;
	
	// update position
	var i = (this.pos[0] + this.vel[0]) % GAME_CONSTANTS.game_width;
	if (i < 0)  // -1 % 5 is 4 in Python, but is -1 in JavaScript!
		i = GAME_CONSTANTS.game_width - i;
	this.pos[0] = i;
	i = (this.pos[1] + this.vel[1]) % GAME_CONSTANTS.game_height;
	if (i < 0)
		i = GAME_CONSTANTS.game_height - i;
	this.pos[1] = i;
	
	// update age
	this.age += 1;
	if (this.lifespan && this.age > this.lifespan)
		return false;
	return true;
};

Sprite.prototype.collide = function(other_sprite) {
	var pos1 = [this.pos[0] + this.image_size[0], this.pos[1] + this.image_size[1]];
	var pos2 = [other_sprite.pos[0] + other_sprite.image_size[0], 
		other_sprite.pos[1] + other_sprite.image_size[1]];
	if (game.dist(pos1, pos2) < (this.radius + other_sprite.radius))
		return true;
	else
		return false;
};

/* The main game class. */

var Game = function() {
	
	/* Initiate member variables. */
	
	this.width = GAME_CONSTANTS.game_width;
	this.height = GAME_CONSTANTS.game_height;
	this.lives = GAME_CONSTANTS.num_lives;
	this.score = 0;
	this.time = 0;
	this.started = false; 
	
	this.my_ship = new Ship([this.width/2-GAME_ASSETS.ship_info.size[0]/2, 
		this.height/2-GAME_ASSETS.ship_info.size[1]/2], [0, 0], 0);
	this.rock_group = new HashSet();
	this.missile_group = new HashSet();
	this.explosion_group = new HashSet();
	
	// we want to override browser's default behavior that a keyDown event 
	// is fired repeatedly when the user keeps the key depressed
	this.up_key_already_down = false;
	this.left_key_already_down = false;
	this.right_key_already_down = false;
	this.space_key_already_down = false;
};

/* Helper functions for class Game. */

Game.prototype.angle_to_vector = function(ang) {
	return [Math.cos(ang), Math.sin(ang)];
};

Game.prototype.dist = function(p, q) {
	return Math.sqrt(Math.pow((p[0]-q[0]), 2) + Math.pow((p[1]-q[1]), 2));
};

Game.prototype.rotate_image_and_draw = function(image, ls, ss, ld, sd, angle) {
	var x = ld[0] + sd[0] / 2;
	var y = ld[1] + sd[1] / 2;
	var context = document.getElementById('gameCanvas').getContext('2d');
	
	context.translate(x, y);
	context.rotate(angle);
	context.drawImage(image, ls[0], ls[1], ss[0], ss[1], -sd[0]/2, -sd[1]/2, sd[0], sd[1]);
	context.rotate(-angle);
	context.translate(-x, -y);
};

Game.prototype.group_collide = function(group, other_sprite) {
	var num_of_collisions = 0;
	var collisions = new HashSet();
	var group_in_array = group.values();
	for (var sprite in group_in_array) {
		if (group_in_array[sprite].collide(other_sprite)) {
			num_of_collisions++;
			collisions.add(group_in_array[sprite]);
			this.explosion_group.add(new Sprite(group_in_array[sprite].pos, [0,0], 0, 0, 
				GAME_ASSETS.explosion_image, GAME_ASSETS.explosion_info, GAME_ASSETS.explosion_sound));
		}
	}
	var collisions_in_array = collisions.values();
	for (var sprite in collisions_in_array) {
		group.remove(collisions_in_array[sprite]);
	}
	return num_of_collisions;
};

Game.prototype.group_group_collide = function(group1, group2) {
	var num_of_collisions = 0;
	var group2_collisions = new HashSet();
	var group2_in_array = group2.values();
	for (var sprite in group2_in_array) {
		var i = this.group_collide(group1, group2_in_array[sprite]);
		num_of_collisions += i;
		if (i > 0)
			group2_collisions.add(group2_in_array[sprite]);
	}
	var group2_collisions_in_array = group2_collisions.values();
	for (var sprite in group2_collisions_in_array) {
		group2.remove(group2_collisions_in_array[sprite]);
	}
	return num_of_collisions;
};

Game.prototype.process_group = function(group) {
	var to_remove = new HashSet();
	var group_in_array = group.values();
	for (var sprite in group_in_array) {
		group_in_array[sprite].draw();
		if (!group_in_array[sprite].update())
			to_remove.add(group_in_array[sprite]);
	}
	var to_remove_in_array = to_remove.values();
	for (var sprite in to_remove_in_array) {
		group.remove(to_remove_in_array[sprite]);
	}
};

Game.prototype.reset = function() {
	this.time = 0;
	this.lives = GAME_CONSTANTS.num_lives;;
	this.score = 0;
	this.rock_group.clear();
	this.missile_group.clear();
	this.explosion_group.clear();
	GAME_ASSETS.soundtrack.currentTime = 0;
	GAME_ASSETS.soundtrack.play();
};

Game.prototype.draw = function() {
	
	// animate background
	this.time += 1;
	var size = GAME_ASSETS.debris_info.size;
	var wtime = (this.time / 8) % (size[0] / 2);
	var context = document.getElementById('gameCanvas').getContext('2d');
	context.drawImage(GAME_ASSETS.nebula_image, 0, 0, this.width, this.height);
	context.drawImage(GAME_ASSETS.debris_image, 0, 0, size[0]-2*wtime, size[1], 
		2.5*wtime, 0, GAME_CONSTANTS.game_width-2.5*wtime, GAME_CONSTANTS.game_height);
	context.drawImage(GAME_ASSETS.debris_image, size[0]-2*wtime, 0, 2*wtime, size[1], 
		0, 0, 2.5*wtime, GAME_CONSTANTS.game_height);
	
	// draw UI
	context.font = "22pt sans-serif";
	context.fillStyle = "rgb(255, 255, 255)";
	context.fillText("Lives", 50, 50);
	context.fillText("Score", 680, 50);
	context.fillText(this.lives, 50, 80);
	context.fillText(this.score, 680, 80);
	
	// detect collisions
	if (this.started) {
		this.score += GAME_CONSTANTS.score_per_rock * this.group_group_collide(
			this.rock_group, this.missile_group);
		if (this.group_collide(this.rock_group, this.my_ship) > 0)
			this.lives -= 1;
	}
	
	// check if the game is over
	if (this.lives == 0)
		this.started = false;
	
	// draw and update ship and sprites
	this.my_ship.draw();
	this.my_ship.update();
	if (!this.started)
		this.rock_group.clear()
	else
		this.process_group(this.rock_group);
	this.process_group(this.missile_group);
	this.process_group(this.explosion_group);
	
	// draw splash screen if not started
	if (!this.started) {
		context.drawImage(GAME_ASSETS.splash_image, this.width/2 - GAME_ASSETS.splash_info.size[0]/2, 
			this.height/2 - GAME_ASSETS.splash_info.size[1]/2);
	}
};

/* Main function. */

var game = new Game();

function main() {

	// specify canvas size
	var canvas = document.getElementById("gameCanvas");
	canvas.width = GAME_CONSTANTS.game_width;
	canvas.height = GAME_CONSTANTS.game_height;
	
	// register event handlers
	canvas.addEventListener('click', function(event) {
		var canvas = document.getElementById("gameCanvas");
		var x = event.pageX - canvas.offsetLeft;
		var y = event.pageY - canvas.offsetTop;
		var center = [game.width / 2, game.height / 2];
		var size = GAME_ASSETS.splash_info.size;
		var inwidth = (center[0] - size[0]/2 < x) && (x < center[0] + size[0]/2);
		var inheight = (center[1] - size[1]/2 < y) && (y < center[1] + size[1]/2);
		if (!game.started && inwidth && inheight) {
			game.started = true;
			game.reset();
		}
	});
	document.addEventListener('keydown', function(event) {
		if (event.keyCode == 37 && !game.left_key_already_down) { // left
			game.my_ship.decrement_angle_vel();
			game.left_key_already_down = true;
		} else if (event.keyCode == 39 && !game.right_key_already_down) { // right
			game.my_ship.increment_angle_vel();
			game.right_key_already_down = true;
		} else if (event.keyCode == 38 && !game.up_key_already_down) { // up
			game.my_ship.set_thrust(true);
			game.up_key_already_down = true;
		} else if (event.keyCode == 32 && !game.space_key_already_down) { // space
			game.my_ship.shoot();
			game.space_key_already_down = true;
		}
	});
	document.addEventListener('keyup', function(event) {
		if (event.keyCode == 37) {
			game.my_ship.increment_angle_vel();
			game.left_key_already_down = false;
		} else if (event.keyCode == 39) {
			game.my_ship.decrement_angle_vel();
			game.right_key_already_down = false;
		} else if (event.keyCode == 38) {
			game.my_ship.set_thrust(false);
			game.up_key_already_down = false;
		} else if (event.keyCode == 32) {
			game.space_key_already_down = false;
		}
	});
	
	// set up rock spawner
	var intervalID = window.setInterval(function(){
		if (game.started && game.rock_group.size() < 12) {
			var pos = game.my_ship.pos;
			while (game.dist(pos, game.my_ship.pos) < GAME_CONSTANTS.ship_respawn_dist)
				pos = [Math.random()*game.width, Math.random()*game.height];
			var vel = [(Math.random()*0.6-0.3)*game.score*GAME_CONSTANTS.rock_upgrade_per_score,
				(Math.random()*0.6-0.3)*game.score*GAME_CONSTANTS.rock_upgrade_per_score];
			var avel = Math.random()*0.2-0.1;
			var a_rock = new Sprite(pos, vel, 0, avel, GAME_ASSETS.asteroid_image, 
				GAME_ASSETS.asteroid_info);
			game.rock_group.add(a_rock);
		}
	}, 1000);
	
	animate();
}

function animate() {
	requestAnimationFrame(animate);
	game.draw();
}

/* Start loading game assets... */

load_assets();