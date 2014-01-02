var config = require('./config.js'),
	fs = require('fs'),
	lib = require('./lib.js'),
	less = new (require('less')).Parser,
	mkdirp = require('mkdirp'),
	path = require('path'),
	rmdir = require('rmdir'),
	Storage = require('./storage.js');

function Frapp(frapp, backend, params, callback) {
	var Window = backend.window.nwDispatcher.requireNwGui().Window,
		repo = lib.getRepoData(frapp),
		self = this;

	this.PARAMS = params;
	this.CALLBACK = callback;
	this.FRAPP = frapp;
	this.BACKEND = backend;
	this.STORAGE = new Storage(repo.author + ':' + repo.name, backend.window);
	this.WIN = Window.open('http://localhost:' + backend.API.httpPort + '/' + repo.author + '/' + repo.name + '/' + frapp.main, {
		position : 'center',
		title : frapp.window && frapp.window.title ? frapp.window.title : frapp.name,
		focus : true,
		toolbar : false,
		show : false,
		width : frapp.window && frapp.window.width ? frapp.window.width : Math.round(window.screen.width * 0.9),
		height : frapp.window && frapp.window.height ? frapp.window.height : Math.round(window.screen.height * 0.9)
	});
	this.WIN.on('close', function() {
		this.close(true);
		backend.API.exit(self.uuid);
	});
	this.WIN.once('loaded', self.onLoad.bind(self));
}

Frapp.prototype.onLoad = function() {
	var self = this,
		window = this.WIN.window;

	window.FRAPP = {
		addSource : function(url, callback) {
			var file = path.join(config.sourcesPath, url.substr(url.lastIndexOf('/') + 1)),
				p = file.lastIndexOf('.json');

			if(p === -1) return callback(false);
			file = file.substr(0, p) + '.json'; //ensure extension
			lib.getJSON(url, function(manifest, raw) {
				if(!manifest || !manifest.version || !manifest.url || !manifest.frapps || !lib.checkPath(file, config.sourcesPath)) return callback(false);
				fs.writeFile(file, raw, function() {
					callback(manifest);
				});
			});
		},
		contextmenu : function(e, items) {
			var gui = self.BACKEND.window.nwDispatcher.requireNwGui(),
				menu = new gui.Menu();

			e.stopPropagation();
			e.preventDefault();
			items.forEach(function(item) {
				menu.append(new gui.MenuItem(item));
			});
			menu.popup(e.clientX + self.WIN.x - 300, e.clientY + self.WIN.y - 190);
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
		getSources : function(callback) {
			self.BACKEND.API.getSources(callback);
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
		load : function(frapp, params, closeCaller, callback) {
			self.BACKEND.API.load(frapp, params, function(frapp) {
				closeCaller && self.WIN.close();
				callback && callback(frapp);
			});
		},
		menu : function() {
			self.BACKEND.API.menu();
		},
		mkdir : function(dirPath, dirName, callback) {
			dirPath = path.join(config.frappsPath, dirPath || '.', path.basename(dirName));
			lib.checkPath(dirPath) && mkdirp(dirPath, callback);
		},
		readFile : function(filePath, fileName, callback) {
			filePath = path.join(config.frappsPath, filePath || '.', path.basename(fileName));
			lib.checkPath(filePath) && fs.readFile(filePath, {
				encoding : 'utf-8'
			}, function(err, contents) {
				callback(contents);
			});
		},
		reload : function() {
			self.reload();
		},
		removeSource : function(url, callback) {
			var file = path.join(config.sourcesPath, url.substr(url.lastIndexOf('/') + 1));
			lib.checkPath(file, config.sourcesPath) && fs.unlink(file, callback);
		},
		rename : function(filePath, fileName, newFileName, callback) {
			var newFilePath = path.normalize(path.join(config.frappsPath, filePath || '.', path.basename(newFileName)));
			filePath = path.normalize(path.join(config.frappsPath, filePath || '.', path.basename(fileName || '.')));
			lib.checkPath(filePath) && lib.checkPath(newFilePath) && fs.rename(filePath, newFilePath, callback);
		},
		rmdir : function(dirPath, callback) {
			dirPath = path.join(config.frappsPath, dirPath);
			lib.checkPath(dirPath) && rmdir(dirPath, callback);
		},
		saveFile : function(filePath, fileName, data, callback) {
			filePath = path.join(filePath || '.', path.basename(fileName));
			var fullPath = path.join(config.frappsPath, filePath);
			lib.checkPath(fullPath) && fs.writeFile(fullPath, data, function(err) {
				self.BACKEND.API.update(filePath, self, callback);
			});
		},
		setTitle : function(title) {
			self.WIN.title = title;
		},
		showDevTools : function() {
			self.WIN.showDevTools();
		},
		signin : function(auth, callback) {
			self.BACKEND.API.signin(auth, callback, auth ? true : false);
		},
		signout : function() {
			self.BACKEND.API.signout();
		},
		storage : (function() {
			return self.STORAGE;
		})(),
		unlink : function(filePath, fileName, callback) {
			filePath = path.join(config.frappsPath, filePath, path.basename(fileName));
			lib.checkPath(filePath) && fs.unlink(filePath, callback);
		},
		update : function(frapp, callback) {
			var repo = lib.getRepoData(frapp);
			rmdir(repo.fullPath, function() {;
				self.BACKEND.API.install(frapp, null, callback, true);
			});
		},
		version : (function() {
			return {
				engine : self.BACKEND.API.version,
				frapp : self.FRAPP.version
			};
		})()
	};
	window.addEventListener('keydown', function(e) {
		(e.ctrlKey || e.metaKey) && e.keyCode === 82 && self.reload();
		(e.ctrlKey || e.metaKey) && e.altKey && e.keyCode === 74 && this.FRAPP.showDevTools();
	});
	
	window.addEventListener('contextmenu', function(e) {
		var items = [
				{
					label : 'Reload',
					click : function() {
						self.reload();
					}
				},
				{
					label : 'Show DevTools',
					click : function() {
						self.WIN.showDevTools();
					}
				},
				{
					label : 'Edit ' + self.FRAPP.name + '\'s Source Code',
					click : function() {
						window.FRAPP.edit(self.FRAPP);
					}
				}
			];

		if(self.FRAPP.repository.type !== 'git' || self.FRAPP.repository.url !== config.menuRepo) items.splice(1, 0, {
			label : 'Frapps Menu',
			click : function() {
				self.BACKEND.API.menu();
			}
		});
		window.FRAPP.contextmenu(e, items);
	});

	/* Frapp Modules */
	var modules = (this.FRAPP.modules || []).slice(),
		head = window.document.head,
		firstChild = head.firstChild,
		loadModules = function() {
			if(!modules.length) return init();
			var module = modules.shift(),
				modulePath = path.join(config.modulesPath, module),
				manifest = path.join(modulePath, 'module.json');

			if(module === 'less') return lib.compileLess(self, firstChild, loadModules);
			fs.exists(manifest, function(exists) {
				if(!exists) return loadModules();
				lib.readJSON(manifest, function(module) {
					var modCSS = (module.css || []),
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
