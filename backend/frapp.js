var config = require('./config'),
	fs = require('fs'),
	lib = require('./lib'),
	less = new (require('less')).Parser,
	mkdirp = require('mkdirp'),
	path = require('path'),
	rmdir = require('rmdir'),
	Storage = require('./storage');

function Frapp(frapp, backend, params, callback) {
	var repo = lib.getRepoData(frapp),
		manifest = path.join(repo.fullPath, 'package.json'),
		self = this;

	this.PARAMS = params;
	this.CALLBACK = callback;
	fs.exists(manifest, function(exists) {
		if(!exists) return backend.API.install(frapp, params, callback);
		lib.readJSON(manifest, function(frapp) {
			var Window = backend.window.nwDispatcher.requireNwGui().Window;
			self.FRAPP = frapp;
			self.BACKEND = backend;
			self.STORAGE = new Storage(repo.author + ':' + repo.name, backend.window);
			self.WIN = Window.open('http://localhost:' + backend.API.httpPort + '/' + repo.author + '/' + repo.name + '/' + frapp.main, {
				position : 'center',
				title : frapp.window && frapp.window.title ? frapp.window.title : frapp.name,
				focus : true,
				toolbar : false,
				show : false,
				width : frapp.window && frapp.window.width ? frapp.window.width : (window.screen.width * 0.9),
				height : frapp.window && frapp.window.height ? frapp.window.height : (window.screen.height * 0.9)
			});
			self.WIN.on('close', function() {
				this.close(true);
				backend.API.exit(self.uuid);
			});
			self.WIN.once('loaded', self.onLoad.bind(self));
		});
	});
}

Frapp.prototype.onLoad = function() {
	var self = this,
		window = this.WIN.window;

	window.FRAPP = {
		close : function() {
			self.WIN.close();
		},
		create : function(params, callback) {
			if(!self.BACKEND.API.session) return;
			lib.createFrapp(self.BACKEND.API.session, params, callback);
		},
		edit : function(frapp) {
			var repo = lib.getRepoData(frapp);
			lib.readJSON(path.join(repo.fullPath, 'package.json'), function(frapp) {
				self.BACKEND.API.load({
					repository : {
						type : 'git',
						url : 'https://github.com/danielesteban/FrappEditor.git'
					}
				}, {
					path : repo.path
				});
			});
		},
		install : function(frapp, params, callback) {
			self.BACKEND.API.install(frapp, params, callback);
		},
		installed : function(callback) {
			self.BACKEND.API.installed(callback);
		},
		listDirectory : function(dir, callback) {
			(!dir || !lib.checkPath(path.join(config.frappsPath, dir))) && (dir = '.');
			fs.readdir(path.join(config.frappsPath, dir), function(err, items) {
				var count = 0,
					data = [],
					cb = function() {
						if(++count < items.count) return;
						callback(data);
					};

				dir !== '.' && items.unshift('..');
				items.forEach(function(item, i) {
					var itemPath = path.join(dir, item);
					fs.stat(path.join(config.frappsPath, itemPath), function(err, stats) {
						data[i] = {
							name : item,
							fullName : itemPath,
							type : stats.isDirectory() ? 'directory' : 'file',
							path : dir
						};
						cb();
					});
				});
			});
		},
		menu : function() {
			self.BACKEND.API.menu();
		},
		mkdir : function(dirPath, callback) {
			dirPath = path.join(config.frappsPath, dirPath);
			lib.checkPath(dirPath) && mkdirp(dirPath, callback);
		},
		rmdir : function(dirPath, callback) {
			dirPath = path.join(config.frappsPath, dirPath);
			lib.checkPath(dirPath) && rmdir(dirPath, callback);
		},
		load : function(frapp, params, closeCaller, callback) {
			closeCaller && this.close();
			self.BACKEND.API.load(frapp, params, callback);
		},
		readFile : function(filePath, callback) {
			filePath = path.join(config.frappsPath, filePath);
			lib.checkPath(filePath) && fs.readFile(filePath, {
				encoding : 'utf-8'
			}, function(err, contents) {
				callback(contents);
			});
		},
		reload : function() {
			self.reload();
		},
		saveFile : function(filePath, data, callback) {
			var fullPath = path.join(config.frappsPath, filePath);
			lib.checkPath(fullPath) && fs.writeFile(fullPath, data, function(err) {
				self.BACKEND.API.update(filePath, self, callback);
			});
		},
		setTitle : function(title) {
			self.WIN.title = title;
		},
		signin : function(auth, callback) {
			self.BACKEND.API.signin(auth, callback, auth ? true : false);
		},
		signout : function() {
			self.BACKEND.API.signout();
		},
		showDevTools : function() {
			self.WIN.showDevTools();
		},
		storage : (function() {
			return self.STORAGE;
		})(),
		unlink : function(filePath, callback) {
			filePath = path.join(config.frappsPath, filePath);
			lib.checkPath(filePath) && fs.unlink(filePath, callback);
		},
		version : (function() {
			return {
				engine : self.BACKEND.API.version,
				frapp : self.FRAPP.version
			};
		})()
	};
	window.addEventListener('keydown', function(e) {
		e.metaKey && e.keyCode === 82 && self.reload();
		e.metaKey && e.altKey && e.keyCode === 74 && this.FRAPP.showDevTools();
	});
	
	var gui = this.BACKEND.window.nwDispatcher.requireNwGui(),
		menu = new gui.Menu();

	menu.append(new gui.MenuItem({
		label : 'Reload',
		click : function() {
			self.reload();
		}
	}));
	menu.append(new gui.MenuItem({
		label : 'Show DevTools',
		click : function() {
			self.WIN.showDevTools();
		}
	}));
	menu.append(new gui.MenuItem({
		label : 'Edit ' + self.FRAPP.name + '\'s Source Code',
		click : function() {
			window.FRAPP.edit(self.FRAPP);
		}
	}));
	window.addEventListener('contextmenu', function(e) { 
		e.preventDefault();
		menu.popup(e.x + self.WIN.x - 300, e.y + self.WIN.y - 200);
	});

	/* Frapp Modules */
	var modules = (this.FRAPP.modules || []).slice(),
		loadModules = function() {
			if(!modules.length) return init();
			var module = modules.shift(),
				modulePath = path.join(config.modulesPath, module),
				manifest = path.join(modulePath, 'module.json');

			if(module === 'less') return lib.compileLess(self, loadModules);
			fs.exists(manifest, function(exists) {
				if(!exists) return loadModules();
				lib.readJSON(manifest, function(module) {
					var head = window.document.head,
						firstChild = head.firstChild,
						modCSS = (module.css || []),
						modJS = (module.js || []),
						modFiles = modCSS.length + modJS.length,
						count = 0,
						modCb = function() {
							if(++count < modFiles) return;
							if(module.name === 'handlebars') return lib.compileTemplates(self, loadModules);
							loadModules();
						};

					if(!modFiles) return modCb();

					modCSS.forEach(function(css) {
						var link = window.document.createElement('link');
						link.href = '/modules/' + module.name + '/' + css;
						link.rel = 'stylesheet';
						link.addEventListener('load', modCb);
						head.insertBefore(link, firstChild);
					});

					modJS.forEach(function(js) {
						var script = window.document.createElement('script');
						script.src = '/modules/' + module.name + '/' + js;
						script.addEventListener('load', modCb);
						head.insertBefore(script, firstChild);
					});
				});
			});	
		},
		init = function() {
			/* Emit init event and show the Frapp */
			var params = {};
			self.PARAMS && (params.params = self.PARAMS);
			self.BACKEND.API.session && (params.session = self.BACKEND.API.session.user);
			lib.emitEvent(self, 'frapp.init', params);
			self.WIN.show();
			if(self.CALLBACK) {
				self.CALLBACK(self);
				delete self.CALLBACK;
			}
		};

	loadModules();
};

Frapp.prototype.close = function() {
	this.WIN.close(true);
};

Frapp.prototype.reload = function() {
	this.WIN.once('loaded', this.onLoad.bind(this));
	this.WIN.window.location.reload();
	this.WIN.title = this.FRAPP.window && this.FRAPP.window.title ? this.FRAPP.window.title : this.FRAPP.name;
};

module.exports = Frapp;
