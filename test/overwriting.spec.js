/* global before, after, describe, it */
var Sails = require('sails').Sails;
var fixtures = require('./helpers/fixtures');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
//app wrapper
var sails;

function loadSails (done) {
  console.log('Loading sails');
  //link node modules to the app dir
  try {
    fs.symlinkSync(path.join(__dirname, '../node_modules'), path.join(__dirname, 'helpers/sampleApp/node_modules'), 'file');
  } catch (e1) {
    if (e1.code !== 'EEXIST') {
      throw e1;
    }
  }
  //Try to lift
  new Sails().load({
    appPath: path.join(__dirname, 'helpers/sampleApp'),
    hooks: {
      'fixtures': require('../lib'),
      'grunt': false,
      'views': false,
      'blueprints': false,
    },
    log: {
      level: 'info'
    },
    connections: {
      test: {
        adapter: 'sails-mongo',
        host:'localhost',
        port: 27017,
        database: 'sails-hook-fixtures-testdb'
      },
    },
    models: {
      connection: 'test',
      migrate: 'drop'
    },
    fixtures: fixtures
  }, function (err, _sails) {
    if (err) { return done(err); }
    sails = _sails;
    return done();
  });
}

function lowerSails (done) {
  console.log('Lowering sails');
  //unlink the node_modules symlink
  try {
    fs.unlinkSync(path.join(__dirname, 'helpers/sampleApp/node_modules'));
  } catch (e0) {
    if (e0.code !== 'EEXIST') {
      throw e0;
    }
  }
  if (sails) {
    return sails.lower(done);
  }
  //otherwise, just done
  return done();
}

function reloadSails (done) {
  lowerSails(function () {
    loadSails(done);
  });
}

describe('Test overwriting ::', function () {
  //before, lift sails
  before(function(done) {
    //set 10sec timeout
    this.timeout(10000);

    //load, then lower, then load again to overwrite the user model
    loadSails(done);
  });

  after(function (done) {
    lowerSails(done);
  });

  it('Should create new User models when reloading', function (done) {
    var User = sails.models.user;
    var ids_before;
    User.find()
    .then(function (results) {
      return _.pluck(results, 'id');
    })
    .then(function (ids) {
      ids_before = ids;
      reloadSails(function () {
        User.find()
        .then(function (results) {
          var ids_after = _.pluck(results, 'id');
          ids_after.should.not.equal(ids_before);
          done();
        })
        .catch(done);
      });
    })
    .catch(done);
  });
});