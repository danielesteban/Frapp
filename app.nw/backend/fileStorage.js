var config = require('./config.js'),
	fs = require('fs'),
	lib = require('./lib.js'),
	mkdirp = require('mkdirp'),
	path = require('path'),
	rmdir = require('rmdir');

function FileStorage(frapp) {
	this.namespace = {
		path : path.join(config.storagePath, frapp.author, frapp.name),
		url : '/storage/' + frapp.author + '/' + frapp.name + '/'
	};
}

FileStorage.prototype.get = function(filePath, name, callback, raw, options) {
	var fileURL = this.namespace.url + (filePath ? filePath.replace(/\\/g, '/') + '/' : '') + name
	filePath = path.join(this.namespace.path, filePath || '.', name);

	lib.checkPath(filePath, config.storagePath) && fs.exists(filePath, function(exists) {
		if(!exists) return callback(false);
		if(!raw) return callback(fileURL);
		fs.readFile(filePath, options, function(err, contents) {
			callback(contents);
		});
	});
};

FileStorage.prototype.set = function(filePath, name, contents, callback, options) {
	var fileURL = this.namespace.url + (filePath ? filePath.replace(/\\/g, '/') + '/' : '') + name;
	filePath = path.join(this.namespace.path, filePath || '.', name);

	lib.checkPath(filePath, config.storagePath) && mkdirp(path.dirname(filePath), function() {
		fs.writeFile(filePath, contents, options, function() {
			callback && callback(fileURL);
		});
	});
};

FileStorage.prototype.remove = function(filePath, name, callback) {
	fs.unlink(path.join(this.namespace.path, filePath || '.', name), callback);
};

FileStorage.prototype.list = function(dir, callback) {
	lib.readDir(this.namespace.path, dir, callback);
};

FileStorage.prototype.clear = function(callback) {
	rmdir(this.namespace.path, callback);
};

module.exports = FileStorage;
