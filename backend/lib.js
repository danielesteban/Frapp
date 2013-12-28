var config = require('./config'),
	fs = require('fs'),
	ghdownload = require('github-download'),
	dir = require('node-dir'),
	mkdirp = require('mkdirp'),
	path = require('path');

function lib() {}

lib.prototype.readJSON = function(file, callback) {
	fs.readFile(file, function(err, file) {
		try {
			file = JSON.parse(file);
		} catch(err) {
			throw err;
		}
		callback(file);
	});
};

lib.prototype.checkPath = function(p) {
	return path.normalize(p).indexOf(config.frappsPath) === 0;
};

lib.prototype.compileTemplates = function(frapp, callback) {
	var window = frapp.WIN.window,
		repo = this.getRepoData(frapp.FRAPP),
		templatesPath = path.join(repo.fullPath, 'templates'),
		compile = function(id, templatesPath, callback) {
			var html;
			window.Handlebars[id] = html = {};
			dir.readFiles(templatesPath, {
				match : /\.handlebars$/,
				exclude : /^\./
			}, function(err, contents, id, next) {
				id = path.basename(id, '.handlebars');
				!html[id] && (html[id] = '');
				html[id] += contents;
				next();
			}, function(err, files) {
				!err && files.forEach(function(id) {
					id = path.basename(id, '.handlebars');
					html[id] = window.Handlebars.compile(html[id]);
				});
				callback();
			});
		};
	
	compile('templates', templatesPath, function() {
		compile('partials', path.join(templatesPath, 'partials'), callback);
	});
};

lib.prototype.emitEvent = function(frapp, name, params) {
	var window = frapp.WIN.window;
	params && (params = {detail : params});
	window.dispatchEvent(new window.CustomEvent(name, params));
};

lib.prototype.getRepoData = function(frapp) {
	if(!frapp.repository || frapp.repository.type !== 'git') throw new Error('Invalid Frapp');
	var repository = frapp.repository.url;
	if(repository.indexOf('https://github.com/') !== 0) throw new Error('Frapp repository must be on github');
	repository = repository.substr(19);
	var p = repository.indexOf('/'),
		author = repository.substr(0, p);
	
	repository = repository.substr(p + 1);
	var name = repository.substr(0, repository.indexOf('.git')),
		frappPath = path.join(author, name);
	
	return {
		name : name,
		author : author,
		path : frappPath,
		fullPath : path.join(config.frappsPath, frappPath)
	};
};

lib.prototype.installApp = function(frapp, callback) {
	var repo = this.getRepoData(frapp);
	mkdirp(repo.fullPath, function() {
		ghdownload(frapp.repository.url, repo.fullPath).on('error', function(err) {
			throw err;
		}).on('end', callback);
	});
};

lib.prototype.createFrapp = function(session, params, callback) {
	var self = this;
	session.API.repos.create(params, function(err, repository) {
		if(err) throw err;
		var frapp = {
				name : params.name,
				version : '0.0.1',
				author : session.user.name + '<' + session.user.email + '>',
				repository : {
					type : 'git',
					url : repository.clone_url
				},
				main : 'index.html'
			};

		var repo = self.getRepoData(frapp);
		mkdirp(repo.fullPath, function() {
			fs.writeFile(path.join(repo.fullPath, 'package.json'), JSON.stringify(frapp, null, 4), function() {
				fs.writeFile(path.join(repo.fullPath, '.gitignore'), '.DS_Store\n._*', function() {
					//TODO: Copy (or clone or fork) Frapp Boilerplate
					fs.writeFile(path.join(repo.fullPath, 'index.html'), '<html>\n\t<head>\n\t</head>\n\t<body>Hello World!\n\t</body>\n</html>', function() {
						//TODO: Init git repo, generate initial commit & push it.
						callback(frapp);
					});
				});
			});
		});
	});
};

module.exports = new lib();