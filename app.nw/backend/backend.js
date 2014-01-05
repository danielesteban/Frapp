var config = require('./config.js'),
	dir = require('node-dir'),
	Frapp = require('./frapp.js'),
	fs = require('fs'),
	ghdownload = require('github-download'),
	github = require('node-github'),
	lib = require('./lib.js'),
	mkdirp = require('mkdirp'),
	path = require('path'),
	rmdir = require('rmdir'),
	Storage = require('./storage.js'),
	zip = require('adm-zip'),
	frapps = [];

BACKEND = {
	httpPort : 7866,
	exit : function(uuid) {
		var menu;
		if(uuid) {
			var index = false;
			frapps.forEach(function(f, i) {
				f.UUID === uuid && (index = i);
				f.FRAPP.repository.type === 'git' && f.FRAPP.repository.url === config.menuRepo && (menu = true);
			});
			index !== false && frapps.splice(index, 1);
		} else {
			frapps.forEach(function(f) {
				f.close();
			});
			frapps = [];
		}
		if(frapps.length) return;
		if(!menu) return this.menu();
		require('nw.gui').Window.get().close(); 
	},
	checkForUpdates : function() {
		var self = this;
		this.installed(function(frapps) {
			var updates = [],
				versionCompare = function(left, right) {
					if(typeof left + typeof right !== 'stringstring') return false;

					var a = left.split('.'),
						b = right.split('.'),
						i = 0, len = Math.max(a.length, b.length);

					for(; i < len; i++) {
						if((a[i] && !b[i] && parseInt(a[i]) > 0) || (parseInt(a[i]) > parseInt(b[i]))) return 1;
						else if ((b[i] && !a[i] && parseInt(b[i]) > 0) || (parseInt(a[i]) < parseInt(b[i]))) return -1;
					}

					return 0;
				},
				check = function() {
					if(!frapps.length) return cb();
					var frapp = frapps.shift(),
						repo = lib.getRepoData(frapp);

					lib.getJSON('https://raw.github.com/' + repo.author + '/' + repo.name + '/master/package.json', function(manifest) {
						if(!manifest || versionCompare(manifest.version, frapp.version) <= 0) return check();
						manifest.path = frapp.path;
						manifest.currentVersion = frapp.version;
						delete manifest.icon;
						frapp.icon && (manifest.icon = frapp.icon);
						updates.push(manifest);
						check();
					});
				},
				cb = function() {
					if(updates.length) self.load({
						repository : {
							type : 'git',
							url : config.installerRepo
						}
					}, { updates : updates });
				};

			/* Update installed Frapps */
			check();

			/* Update source lists */
			self.getSources(function(sourceList, filename, next) {
				lib.getJSON(sourceList.url, function(manifest, raw) {
					if(!manifest || versionCompare(manifest.version, sourceList.version) <= 0) return next();
					fs.writeFile(filename, raw, next);
				});
			}, true);

			/* Update Frapp engine */
			lib.getJSON(config.frappManifest, function(manifest) {
				if(!manifest || versionCompare(manifest.version, self.version) <= 0) return;
				var https = require('https');
				https.get(config.frappUpdate.replace(/{{version}}/, manifest.version), function(res) {
					if(res.statusCode !== 302 || !res.headers['location']) return;
					https.get(res.headers['location'], function(res) {
						if(res.statusCode !== 200) return;
						var update = '';
						res.setEncoding('binary');
						res.on('data', function(chunk) {
							update += chunk;
						});
						res.on('end', function() {
							var updatePath = path.join(config.resourcesPath, 'package.nw');
							fs.writeFile(updatePath, update, 'binary', function(err) {
								if(err || process.platform !== 'darwin') return;
								var enginePath = path.join(config.resourcesPath, 'app.nw');
								rmdir(enginePath, function() {
									(new zip(updatePath)).extractAllTo(enginePath);
									fs.unlink(updatePath);
									var plistPath = path.join(config.resourcesPath, '..', 'Info.plist');
									fs.readFile(plistPath, 'utf-8', function(err, plist) {
										var p = plist.indexOf('<string>', plist.indexOf('<key>CFBundleShortVersionString</key>')) + 8;
										fs.writeFile(plistPath, plist.substr(0, p) + 'v' + manifest.version + plist.substr(plist.indexOf('</string>', p)));
									});
								});
							});
						});
					});
				});
			});
		});
	},
	getSources : function(callback, oneAtATime) {
		var sources = [];
		dir.readFiles(config.sourcesPath, {
			match : /\.json$/,
			exclude : /^\./,
			recursive  : false
		}, function(err, sourceList, filename, next) {
			try {
				sourceList = JSON.parse(sourceList);
			} catch(err) {
				return next();
			}
			if(oneAtATime) return callback(sourceList, filename, next);
			sources.push(sourceList);
			next();
		}, function() {
			!oneAtATime && callback(sources);
		});
	},
	install : function(frapp, params, callback, justInstall) {
		var repo = lib.getRepoData(frapp),
			self = this,
			installer,
			install = function() {
				mkdirp(path.join(config.frappsPath, repo.author), function() {
					ghdownload(frapp.repository.url, repo.fullPath).on('error', function(err) {
						throw err;
					}).on('zip', function(zipUrl) {
						installer && installer.WIN.window.$('small.url').text(zipUrl);
					}).on('end', function() {
						var cb = function(frapp) {
								installer && installer.WIN.close();
								callback && callback(frapp);
							};

						if(justInstall) return cb(frapp);
						self.load(frapp, params, cb);
					});
				});
			};

		if(frapp.repository.url === config.installerRepo) return install();
		this.load({
			repository : {
				type : 'git',
				url : config.installerRepo
			}
		}, { install : repo }, function(frapp) {
			installer = frapp;
			install();
		});
	},
	installed : function(callback) {
		fs.readdir(config.frappsPath, function(err, authors) {
			if(err) return callback([]);
			var frapps = [],
				authorsCount = 0,
				authorsCb = function() {
					if(++authorsCount < authors.length) return;
					frapps.sort(function(a, b) {
						var x = a.ctime.getTime(),
							y = b.ctime.getTime();

						return (x > y ? -1 : (x < y ? 1 : 0));
					});
					callback(frapps);		
				};

			authors.forEach(function(author) {
				var authorPath = path.join(config.frappsPath, author);
				fs.stat(authorPath, function(err, stats) {
					if(!stats.isDirectory()) return authorsCb();
					fs.readdir(authorPath, function(err, authorFrapps) {
						var frappsCount = 0,
							frappsCb = function() {
								if(++frappsCount < authorFrapps.length) return;
								authorsCb();		
							};

						if(!authorFrapps.length) return frappsCb();
						authorFrapps.forEach(function(frapp) {
							var frappPath = path.join(authorPath, frapp);
							fs.stat(frappPath, function(err, stats) {
								if(!stats.isDirectory()) return frappsCb();
								var manifestPath = path.join(frappPath, 'package.json');
								fs.exists(manifestPath, function(exists) {
									if(!exists) return frappsCb();
									fs.readFile(manifestPath, function(err, manifest) {
										try {
											manifest = JSON.parse(manifest);
										} catch(err) {
											return frappsCb();
										}
										manifest.ctime = stats.ctime;
										manifest.path = '/' + author + '/' + frapp;
										frapps.push(manifest);
										frappsCb();
									});
								});
							});
						});
					});
				});
			});
		});
	},
	load : function(frapp, params, callback) {
		var repo = lib.getRepoData(frapp),
			manifest = path.join(repo.fullPath, 'package.json'),
			self = this;

		fs.exists(manifest, function(exists) {
			if(!exists) return self.install(frapp, params, callback);
			lib.readJSON(manifest, function(frapp) {
				new Frapp(frapp, {
					API : self,
					window : window
				}, params, function(frapp) {
					frapps.push(frapp);
					callback && callback(frapp);
				});
			});
		});
	},
	menu : function() {
		var already;
		frapps.forEach(function(f, i) {
			f.FRAPP.repository.type === 'git' && f.FRAPP.repository.url === config.menuRepo && (already = f);
		});
		if(already) return already.WIN.show();
		this.load({
			repository : {
				type : 'git',
				url : config.menuRepo
			}
		});
	},
	signin : function(auth, callback, fromSignin) {
		if(this.session) return callback && callback(false);
		var authStorage = new Storage('github', window),
			githubClient = new github({
				version : '3.0.0'
			}),
			self = this;

		if(auth) authStorage.set('auth', auth);
		else auth = authStorage.get('auth');
		if(!auth || auth.username === '' || auth.password === '') {
			!fromSignin && this.load({
				repository : {
					type : 'git',
					url : config.signinRepo
				}
			});
			callback && callback(false);
			return;
		}
		githubClient.authenticate({
		    type : 'basic',
		    username : auth.username,
		    password : auth.password
		});
		githubClient.user.get({}, function(err, user) {
			if(err) return callback && callback(false);
			self.session = {
				API : githubClient,
				user : user
			};
			frapps.forEach(function(f) {
				lib.emitEvent(f, 'frapp.signin', {session : user});
			});
			callback && callback(self.session);
		});
	},
	signout : function() {
		(new Storage('github', window)).remove('auth');
		delete this.session;
		frapps.forEach(function(f) {
			lib.emitEvent(f, 'frapp.signout');
		});
	},
	update : function(file, editor, callback) {
		editor.WIN.setAlwaysOnTop(true);
		frapps.forEach(function(f) {
			var repo = lib.getRepoData(f.FRAPP);
			file.indexOf(repo.path) === 0 && f.UUID !== editor.UUID && f.reload();
		});
		setTimeout(function() {
			editor.WIN.setAlwaysOnTop(false);
			editor.WIN.show();
			callback();
		}, 250);
	},
	version : (function() {
		var manifest = fs.readFileSync(path.join(process.cwd(), 'package.json'));
		try {
			manifest = JSON.parse(manifest);
		} catch(err) {
			throw err;
		}
		return manifest.version;
	})()
};

/* HTTP Server */
(function() {
	var frappsServer = new (require('node-static').Server)(config.frappsPath, {cache: 0}),
		modulesServer = new (require('node-static').Server)(config.modulesPath, {cache: 0}),
		storageServer = new (require('node-static').Server)(config.storagePath, {cache: 0}),
		httpServer = require('http').createServer(function(request, response) {
			request.addListener('end', function() {
		    	if(request.url.substr(0, 9) === '/modules/') {
		    		request.url = request.url.substr(8);
		    		modulesServer.serve(request, response);
		    	} else if(request.url.substr(0, 9) === '/storage/') {
		    		request.url = request.url.substr(9);
		    		var p = request.url.indexOf('/'),
		    			uuid = request.url.substr(0, p),
		    			index = false;

		    		request.url = request.url.substr(p);
					frapps.forEach(function(f, i) {
						f.UUID === uuid && (index = i);
					});
					if(index === false) {
						response.writeHead(403, {});
						return response.end();
					}
					var repo = lib.getRepoData(frapps[index].FRAPP);
					request.url = '/' + repo.author + '/' + repo.name + request.url;
					storageServer.serve(request, response);
		    	} else frappsServer.serve(request, response);
		    }).resume();
		});

	httpServer.on('error', function(e) {
		if(e.code !== "EADDRINUSE") return;
		BACKEND.httpPort++;
		setTimeout(function() {
			httpServer.listen(BACKEND.httpPort, 'localhost');
		}, 1);
	});

	httpServer.on('listening', function() {
		BACKEND.signin(false, null, true);
		BACKEND.checkForUpdates();
		BACKEND.menu();
	});

	httpServer.listen(BACKEND.httpPort, 'localhost');
})();
