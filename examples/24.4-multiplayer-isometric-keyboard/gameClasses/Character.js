// Define our player character classes
var Character = IgeEntity.extend({
	classId: 'Character',

	init: function () {
		var self = this;
		IgeEntity.prototype.init.call(this);

		// Set the co-ordinate system as isometric
		this.isometric(true);
		
		if (ige.isServer) {
			this.addComponent(IgeVelocityComponent);
		}
		
		if (ige.isClient) {
			// Setup the entity
			self.addComponent(IgeAnimationComponent)
				.depth(1);
			
			// Load the character texture file
			this._characterTexture = new IgeCellSheet('../assets2/textures/sprites/baker.png', 4, 4, 128, 192);
			
	
			// Wait for the texture to load
			this._characterTexture.on('loaded', function () {
				self.texture(self._characterTexture)
					.dimensionsFromCell();
				
				self.setType(0);
			}, false, true);
		}
		
		this._lastTranslate = this._translate.clone();
	},

	/**
	 * Sets the type of character which determines the character's
	 * animation sequences and appearance.
	 * @param {Number} type From 0 to 7, determines the character's
	 * appearance.
	 * @return {*}
	 */
	setType: function (type) {
		switch (type) {
			case 0:
				this.animation.define('walkDown', [1, 2, 3, 4], 8, -1)
					.animation.define('walkLeft', [5, 6, 7, 8], 8, -1)
					.animation.define('walkRight', [9, 10, 11, 12], 8, -1)
					.animation.define('walkUp', [13, 14, 15, 16], 8, -1)
					.cell(1);

				this._restCell = 1;
				break;
		}

		this._characterType = type;

		return this;
	},

	update: function (ctx, tickDelta) {
		if (ige.isClient) {
			// Set the current animation based on direction
			var self = this,
				oldX = this._lastTranslate.x,
				oldY = this._lastTranslate.y * 2,
				currX = this.translate().x(),
				currY = this.translate().y() * 2,
				distX = currX - oldX,
				distY = currY - oldY,
				distance = Math.distance(
					oldX,
					oldY,
					currX,
					currY
				),
				speed = 0.1,
				time = (distance / speed);
			
			this._lastTranslate = this._translate.clone();
	
			if (distX == 0 && distY == 0) {
				this.animation.stop();
			} else {
				// Set the animation based on direction
				if (Math.abs(distX) > Math.abs(distY)) {
					// Moving horizontal
					if (distX < 0) {
						// Moving left
						this.animation.select('walkLeft');
					} else {
						// Moving right
						this.animation.select('walkRight');
					}
				} else {
					// Moving vertical
					if (distY < 0) {
						if (distX < 0) {
							// Moving up-left
							this.animation.select('walkUp');
						} else {
							// Moving up
							this.animation.select('walkRight');
						}
					} else {
						if (distX > 0) {
							// Moving down-right
							this.animation.select('walkDown');					
						} else {
							// Moving down
							this.animation.select('walkLeft');
						}
					}
				}
			}
			
			// Set the depth to the y co-ordinate which basically
			// makes the entity appear further in the foreground
			// the closer they become to the bottom of the screen
			this.depth(this._translate.y);
		}
		
		IgeEntity.prototype.update.call(this, ctx, tickDelta);
	},

	destroy: function () {
		// Destroy the texture object
		if (this._characterTexture) {
			this._characterTexture.destroy();
		}

		// Call the super class
		IgeEntity.prototype.destroy.call(this);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Character; }
