var IgeBox2dComponent = IgeEventingClass.extend({
	classId: 'IgeBox2dComponent',
	componentId: 'box2d',

	init: function (entity, options) {
		// Check that the engine has not already started
		// as this will mess everything up if it has
		if (ige._state !== 0) {
			this.log('Cannot add box2d component to the ige instance once the engine has started!', 'error');
		}

		this._entity = entity;
		this._options = options;

		this.b2Color = Box2D.Common.b2Color;
		this.b2Vec2 = Box2D.Common.Math.b2Vec2;
		this.b2Math = Box2D.Common.Math.b2Math;
		this.b2Shape = Box2D.Collision.Shapes.b2Shape;
		this.b2BodyDef = Box2D.Dynamics.b2BodyDef;
		this.b2Body = Box2D.Dynamics.b2Body;
		this.b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
		this.b2Fixture = Box2D.Dynamics.b2Fixture;
		this.b2World = Box2D.Dynamics.b2World;
		this.b2MassData = Box2D.Collision.Shapes.b2MassData;
		this.b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
		this.b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
		this.b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
		this.b2ContactListener = Box2D.Dynamics.b2ContactListener;
		this.b2Distance = Box2D.Collision.b2Distance;

		this._active = true;
		this._sleep = true;
		this._scaleRatio = 30;
		this._gravity = new this.b2Vec2(0, 0);

		this._removeWhenReady = [];

		// Add the box2d behaviour to the ige
		ige.addBehaviour('box2dStep', this._behaviour);

		this.log('Physics component initiated!');
	},

	/**
	 * Gets / sets if the world should allow sleep or not.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	sleep: function (val) {
		if (val !== undefined) {
			this._sleep = val;
			return this._entity;
		}

		return this._sleep;
	},

	/**
	 * Gets / sets the current engine to box2d scaling ratio.
	 * @param val
	 * @return {*}
	 */
	scaleRatio: function (val) {
		if (val !== undefined) {
			this._scaleRatio = val;
			return this._entity;
		}

		return this._scaleRatio;
	},

	/**
	 * Gets / sets the gravity vector.
	 * @param val
	 * @return {*}
	 */
	gravity: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._gravity = new this.b2Vec2(x, y);
			return this._entity;
		}

		return this._gravity;
	},

	/**
	 * Gets the current Box2d world object.
	 * @return {b2World}
	 */
	world: function () {
		return this._world;
	},

	/**
	 * Creates the Box2d world.
	 * @return {*}
	 */
	createWorld: function () {
		this._world = new this.b2World(
			this._gravity,
			this._sleep
		);

		this.log('World created');

		return this._entity;
	},

	/**
	 * Creates a Box2d fixture and returns it.
	 * @param params
	 * @return {b2FixtureDef}
	 */
	createFixture: function (params) {
		var tempDef = new this.b2FixtureDef(),
			param;

		for (param in params) {
			if (params.hasOwnProperty(param)) {
				if (param !== 'shape') {
					tempDef[param] = params[param];
				}
			}
		}

		return tempDef;
	},

	/**
	 * Creates a Box2d body and attaches it to an IGE entity
	 * based on the supplied body definition.
	 * @param {IgeEntity} entity
	 * @param {Object} body
	 * @return {b2Body}
	 */
	createBody: function (entity, body) {
		var tempDef = new this.b2BodyDef(),
			param,
			tempBod,
			fixtureDef,
			tempFixture,
			tempShape,
			i,
			finalX, finalY,
			finalWidth, finalHeight;

		// Process body definition and create a box2d body for it
		switch (body.type) {
			case 'static':
				tempDef.type = this.b2Body.b2_staticBody;
				break;

			case 'dynamic':
				tempDef.type = this.b2Body.b2_dynamicBody;
				break;
		}

		// Add the parameters of the body to the new body instance
		for (param in body) {
			if (body.hasOwnProperty(param)) {
				switch (param) {
					case 'type':
					case 'gravitic':
					case 'fixedRotation':
					case 'fixtures':
						// Ignore these for now, we process them
						// below as post-creation attributes
						break;

					default:
						tempDef[param] = body[param];
						break;
				}
			}
		}

		// Set the position
		tempDef.position = new this.b2Vec2(entity._translate.x / this._scaleRatio, entity._translate.y / this._scaleRatio);

		// Create the new body
		tempBod = this._world.CreateBody(tempDef);

		// Now apply any post-creation attributes we need to
		for (param in body) {
			if (body.hasOwnProperty(param)) {
				switch (param) {
					case 'gravitic':
						if (!body.gravitic) {
							tempBod.m_nonGravitic = true;
						}
						break;

					case 'fixedRotation':
						if (body.fixedRotation) {
							tempBod.SetFixedRotation(true);
						}
						break;

					case 'fixtures':
						for (i = 0; i < body.fixtures.length; i++) {
							// Grab the fixture definition
							fixtureDef = body.fixtures[i];

							// Create the fixture
							tempFixture = this.createFixture(fixtureDef);

							// Check for a shape definition for the fixture
							if (fixtureDef.shape) {
								// Create based on the shape type
								switch (fixtureDef.shape.type) {
									case 'polygon':
										tempShape = new this.b2PolygonShape();
										tempShape.SetAsArray(fixtureDef.shape.data._poly, fixtureDef.shape.data.length());

										tempFixture.shape = tempShape;
										tempBod.CreateFixture(tempFixture);
										break;

									case 'rectangle':
										tempShape = new this.b2PolygonShape();

										if (fixtureDef.shape.data) {
											finalX = fixtureDef.shape.data.x !== undefined ? fixtureDef.shape.data.x : 0;
											finalY = fixtureDef.shape.data.y !== undefined ? fixtureDef.shape.data.y : 0;
											finalWidth = fixtureDef.shape.data.width !== undefined ? fixtureDef.shape.data.width : (entity.geometry.x / 2);
											finalHeight = fixtureDef.shape.data.height !== undefined ? fixtureDef.shape.data.height : (entity.geometry.y / 2);
										} else {
											finalX = 0;
											finalY = 0;
											finalWidth = (entity.geometry.x / 2);
											finalHeight = (entity.geometry.y / 2);
										}

										// Set the polygon as a box
										tempShape.SetAsOrientedBox(
											(finalWidth / this._scaleRatio),
											(finalHeight / this._scaleRatio),
											new this.b2Vec2(finalX / this._scaleRatio, finalY / this._scaleRatio),
											0
										);

										tempFixture.shape = tempShape;
										tempBod.CreateFixture(tempFixture);
										break;
								}
							}
						}
						break;
				}
			}
		}

		// Store the entity that is linked to this body
		tempBod._entity = entity;

		// Add the body to the world with the passed fixture
		return tempBod;
	},

	enableDebug: function (mountScene) {
		if (mountScene && mountScene._classId === 'IgeScene2d') {
		// Define the debug drawing instance
		var debugDraw = new this.b2DebugDraw();
		this._box2dDebug = true;

		debugDraw.SetSprite(ige._ctx);
		debugDraw.SetDrawScale(this._scaleRatio);
		debugDraw.SetFillAlpha(0.3);
		debugDraw.SetLineThickness(1.0);
		debugDraw.SetFlags(
			this.b2DebugDraw.e_controllerBit
			| this.b2DebugDraw.e_jointBit
			| this.b2DebugDraw.e_pairBit
			| this.b2DebugDraw.e_shapeBit
			| this.b2DebugDraw.e_aabbBit
			| this.b2DebugDraw.e_centerOfMassBit
		);

		// Set the debug draw for the world
		this._world.SetDebugDraw(debugDraw);

		// Create the debug painter entity and mount
		// it to the passed scene
		new igeClassStore.Box2dDebugPainter()
			.depth(40000) // Set a really high depth
			.mount(mountScene);
		} else {
			this.log('Cannot enable box2d debug drawing because the passed argument is not an IgeScene2d instance. Pass your main scene instance to enable debug drawing on it.', 'error')
		}
	},

	/**
	 * Queues a body for removal from the physics world.
	 * @param body
	 */
	destroyBody: function (body) {
		this._removeWhenReady.push(body);
	},

	/**
	 * Gets / sets the callback method that will be called after
	 * every physics world step.
	 * @param method
	 * @return {*}
	 */
	updateCallback: function (method) {
		if (method !== undefined) {
			this._updateCallback = method;
			return this._entity;
		}

		return this._updateCallback;
	},

	/**
	 * Steps the physics simulation forward.
	 * @param ctx
	 * @private
	 */
	_behaviour: function (ctx) {
		var self = ige.box2d,
			tempBod,
			entity,
			entityBox2dBody,
			removeWhenReady,
			count,
			destroyBody;

		if (self._active && self._world) {
			// Remove any bodies that were queued for removal
			removeWhenReady = self._removeWhenReady;
			count = removeWhenReady.length;

			if (count) {
				destroyBody = self._world.DestroyBody;
				while (count--) {
					destroyBody.apply(self._world, [removeWhenReady[count]]);
				}
				self._removeWhenReady = [];
				removeWhenReady = null;
			}

			// Call the world step; frame-rate, velocity iterations, position iterations
			self._world.Step(1 / 60, 8, 8);

			// Loop the physics objects and move the entities they are assigned to
			tempBod = self._world.GetBodyList();
			while (tempBod) {
				if (tempBod._entity) {
					// Body has an entity assigned to it
					entity = tempBod._entity; //self.ige.entities.read(tempBod.m_userData);
					entityBox2dBody = entity._box2dBody;

					// Check if the body is awake and is dynamic (we don't transform static bodies)
					if (tempBod.IsAwake()) {
						// Update the entity data to match the body data
						entityBox2dBody.updating = true;
						entity.translateTo(tempBod.m_xf.position.x * self._scaleRatio, tempBod.m_xf.position.y * self._scaleRatio, entity._translate.z);
						entity.rotateTo(entity._rotate.x, entity._rotate.y, tempBod.GetAngle());
						entityBox2dBody.updating = false;

						if (entityBox2dBody.asleep) {
							// The body was asleep last frame, fire an awake event
							entityBox2dBody.asleep = false;
							self.emit('afterAwake', entity);
						}
					} else {
						if (!entityBox2dBody.asleep) {
							// The body was awake last frame, fire an asleep event
							entityBox2dBody.asleep = true;
							self.emit('afterAsleep', entity);
						}
					}
				}

				tempBod = tempBod.GetNext();
			}

			// Clear forces because we have ended our physics simulation frame
			self._world.ClearForces();

			tempBod = null;
			entity = null;

			if (typeof(self._updateCallback) === 'function') {
				self._updateCallback();
			}
		}
	}
});

var Box2dDebugPainter = IgeEntity.extend({
	classId: 'Box2dDebugPainter',

	tick: function (ctx) {
		ige.box2d._world.DrawDebugData();
		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeBox2dComponent; }