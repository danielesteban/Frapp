var config = require('./config'),
	Frapp = require('./frapp'),
	fs = require('fs'),
	github = require('node-github'),
	lib = require('./lib'),
	path = require('path'),
	Storage = require('./storage'),
	uuid = require('node-uuid');
	Window = window.nwDispatcher.requireNwGui().Window,
	frapps = [];

BACKEND = {
	exit : function(uuid) {
		var menu;
		if(uuid) {
			var index = false;
			frapps.forEach(function(f, i) {
				f.uuid === uuid && (index = i);
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
		Window.get().close(); 
	},
	install : function(frapp) {
		lib.installApp(frapp, function() {
			BACKEND.load(frapp);
		});
	},
	installed : function(callback) {
		fs.readdir(config.frappsPath, function(err, authors) {
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
										manifest.path = frappPath;
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
	load : function(frapp, params) {
		var o = new Frapp(frapp, {
			API : this,
			window : window
		}, params);
		o.uuid = uuid.v4();
		frapps.push(o);
	},
	menu : function() {
		this.load({
			"repository" : {
				"type" : "git",
				"url" : config.menuRepo
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
				"repository" : {
					"type" : "git",
					"url" : config.signinRepo
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
		editor.setAlwaysOnTop(true);
		frapps.forEach(function(f) {
			var repo = lib.getRepoData(f.FRAPP);
			file.indexOf(repo.path) === 0 && f.uuid !== editor.uuid && f.reload();
		});
		editor.focus();
		setTimeout(function() {
			editor.setAlwaysOnTop(false);
			callback();
		}, 500);
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

BACKEND.signin(false, function() {
	BACKEND.menu();
}, true);
