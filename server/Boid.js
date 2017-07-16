/**
 * Based on THREE example: https://github.com/mrdoob/three.js/blob/master/examples/canvas_geometry_birds.html
 * Which is based on http://www.openprocessing.org/visuals/?visualID=6910
 */
 var THREE = require('./three01.js');
 var vector = new THREE.Vector3(),
    _width = 500,
    _height = 500,
    _depth = 200,
    _neighborhoodRadius = 100,
    _maxSpeed = 4,
    _maxSteerForce = 0.1,
    _avoidWalls = false,
    _goal;

exports.create = function(maxSpeed, maxSteerForce) {

  //var vector = new THREE.Vector3(),
 //   fish.acceleration,
 //   _width = 500,
//    _height = 500,
//    _depth = 200,
//    _neighborhoodRadius = 100,
    _maxSpeed = maxSpeed || 4,
    _maxSteerForce = maxSteerForce || 0.1,
    //_avoidWalls = false,
    //_goal;
    //fish.acceleration = new THREE.Vector3();
  this.position = new THREE.Vector3();
  this.velocity = new THREE.Vector3();
  this.acceleration = new THREE.Vector3();

  // this.setGoal = function ( target ) {

  //   _goal = target;

  // };

  this.setAvoidWalls = function ( value ) {

    _avoidWalls = value;

  };

  this.setWorldSize = function ( width, height, depth ) {

    _width = width;
    _height = height;
    _depth = depth;

  };
}
exports.run = function (fish, boids ) {

    if ( _avoidWalls ) {

      vector.set( - _width, fish.position.y, fish.position.z );
      vector = exports.avoid(fish, vector );
      vector.multiplyScalar( 5 );
      fish.acceleration.addSelf( vector );

      vector.set( _width, fish.position.y, fish.position.z );
      vector = exports.avoid(fish, vector );
      vector.multiplyScalar( 5 );
      fish.acceleration.addSelf( vector );

      vector.set( fish.position.x, - _height, fish.position.z );
      vector = exports.avoid(fish, vector );
      vector.multiplyScalar( 5 );
      fish.acceleration.addSelf( vector );

      vector.set( fish.position.x, _height, fish.position.z );
      vector = exports.avoid(fish, vector );
      vector.multiplyScalar( 5 );
      fish.acceleration.addSelf( vector );

      vector.set( fish.position.x, fish.position.y, - _depth );
      vector = exports.avoid(fish, vector );
      vector.multiplyScalar( 5 );
      fish.acceleration.addSelf( vector );

      vector.set( fish.position.x, fish.position.y, _depth );
      vector = exports.avoid(fish, vector );
      vector.multiplyScalar( 5 );
      fish.acceleration.addSelf( vector );

    }/* else {

      this.checkBounds();

    }
    */

    if ( Math.random() > 0.5 ) {

      exports.flock( fish, boids );

    }

    exports.move(fish);

  }

  exports.flock = function (fish, boids ) {

    if ( _goal ) {

      fish.acceleration.addSelf( exports.reach( fish, _goal, 0.005 ) );

    }

    fish.acceleration.addSelf( exports.alignment(fish, boids ) );
    fish.acceleration.addSelf( exports.cohesion(fish, boids ) );
    fish.acceleration.addSelf( exports.separation(fish, boids ) );

  }

  exports.move = function (fish) {

    fish.velocity.addSelf( fish.acceleration );

    var l = fish.velocity.length();

    if ( l > _maxSpeed ) {

      fish.velocity.divideScalar( l / _maxSpeed );

    }

    fish.position.addSelf( fish.velocity );
    fish.acceleration.set( 0, 0, 0 );

  };

  // exports.checkBounds = function (this) {

  //   if ( this.position.x >   _width ) this.position.x = - _width;
  //   if ( this.position.x < - _width ) this.position.x =   _width;
  //   if ( this.position.y >   _height ) this.position.y = - _height;
  //   if ( this.position.y < - _height ) this.position.y =  _height;
  //   if ( this.position.z >  _depth ) this.position.z = - _depth;
  //   if ( this.position.z < - _depth ) this.position.z =  _depth;

  // };

  //

  exports.avoid = function (fish, target ) {

    var steer = new THREE.Vector3();

    steer.copy( fish.position );
    steer.subSelf( target );

    steer.multiplyScalar( 1 / fish.position.distanceToSquared( target ) );

    return steer;

  }

  exports.repulse = function (fish, target ) {

    var distance = fish.position.distanceTo( target );

    if ( distance < 100 ) {

      var steer = new THREE.Vector3();

      steer.subVectors( fish.position, target );
      steer.multiplyScalar( 0.5 / distance );

      fish.acceleration.addSelf( steer );

    }

  }

  exports.reach = function (fish, target, amount ) {

    var steer = new THREE.Vector3();

    steer.subVectors( target, fish.position );
    steer.multiplyScalar( amount );

    return steer;

  }

  exports.alignment = function (fish, boids ) {

    var boid, velSum = new THREE.Vector3(),
    count = 0;

    for ( var i = 0, il = boids.length; i < il; i++ ) {

      if ( Math.random() > 0.6 ) continue;

      boid = boids[ i ];

      distance = boid.position.distanceTo( fish.position );

      if ( distance > 0 && distance <= _neighborhoodRadius ) {

        velSum.addSelf( boid.velocity );
        count++;

      }

    }

    if ( count > 0 ) {

      velSum.divideScalar( count );

      var l = velSum.length();

      if ( l > _maxSteerForce ) {

        velSum.divideScalar( l / _maxSteerForce );

      }

    }

    return velSum;

  }

  exports.cohesion = function ( fish, boids ) {

    var boid, distance,
    posSum = new THREE.Vector3(),
    steer = new THREE.Vector3(),
    count = 0;

    for ( var i = 0, il = boids.length; i < il; i ++ ) {

      if ( Math.random() > 0.6 ) continue;

      boid = boids[ i ];
      distance = boid.position.distanceTo( fish.position );

      if ( distance > 0 && distance <= _neighborhoodRadius ) {

        posSum.addSelf( boid.position );
        count++;

      }

    }

    if ( count > 0 ) {

      posSum.divideScalar( count );

    }

    steer.subVectors( posSum, fish.position );

    var l = steer.length();

    if ( l > _maxSteerForce ) {

      steer.divideScalar( l / _maxSteerForce );

    }

    return steer;

  };

  exports.separation = function (fish, boids ) {

    var boid, distance,
    posSum = new THREE.Vector3(),
    repulse = new THREE.Vector3();

    for ( var i = 0, il = boids.length; i < il; i ++ ) {

      if ( Math.random() > 0.6 ) continue;

      boid = boids[ i ];
      distance = boid.position.distanceTo( fish.position );

      if ( distance > 0 && distance <= _neighborhoodRadius ) {

        repulse.subVectors( fish.position, boid.position );
        repulse.normalize();
        repulse.divideScalar( distance );
        posSum.addSelf( repulse );

      }

    }

    return posSum;

  }

