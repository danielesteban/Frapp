var config = require('./config.js'),
	dir = require('node-dir'),
	fs = require('fs'),
	ghdownload = require('github-download'),
	less = require('less'),
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

lib.prototype.getJSON = function(url, callback) {
	require('https').get(url, function(res) {
		var raw = '';
		res.setEncoding('utf8');
		res.on('data', function(chunk) {
			raw += chunk;
		});
		res.on('end', function() {
			var json;
			try {
				json = JSON.parse(raw);
			} catch(e) {
				return callback(false, raw);
			}
			callback(json, raw);
		});
	});
};

lib.prototype.checkPath = function(p, root) {
	root = root || config.frappsPath;
	return path.normalize(p).indexOf(root) === 0;
};

lib.prototype.compileTemplates = function(frapp, callback) {
	var window = frapp.WIN.window,
		repo = this.getRepoData(frapp.FRAPP),
		templatesPath = path.join(repo.fullPath, 'templates'),
		compile = function(id, templatesPath, callback) {
			var templates = window.Handlebars[id] = {};
			dir.readFiles(templatesPath, {
				match : /\.handlebars$/,
				exclude : /^\./,
				recursive  : false
			}, function(err, contents, filename, next) {
				templates[path.basename(filename, '.handlebars')] = window.Handlebars.compile(contents);
				next();
			}, callback);
		};
	
	compile('templates', templatesPath, function() {
		compile('partials', path.join(templatesPath, 'partials'), callback);
	});
};

lib.prototype.compileLess = function(frapp, insertBefore, callback) {
	var window = frapp.WIN.window,
		repo = this.getRepoData(frapp.FRAPP),
		lessPath = path.join(repo.fullPath, 'css', 'screen.less'),
		parser = new(less.Parser)({
			paths: [path.join(repo.fullPath, 'css')]
		});

	fs.readFile(lessPath, {
		encoding : 'utf-8'
	}, function(err, css) {
		if(err) return callback();
		parser.parse(css, function (err, tree) {
			var style = window.document.createElement('style');
			style.appendChild(window.document.createTextNode(tree.toCSS({compress : true})));
			insertBefore.parentNode.insertBefore(style, insertBefore);
		    callback();
		});
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
	p = repository.lastIndexOf('.git');
	var name = repository.substr(0, p !== -1 ? p : repository.length),
		frappPath = path.join(author, name);
	
	return {
		name : name,
		author : author,
		path : frappPath,
		fullPath : path.join(config.frappsPath, frappPath)
	};
};

lib.prototype.createFrapp = function(session, params, callback) {
	params.name = path.basename(params.name);
	var repoPath = path.join(config.frappsPath, session.user.login, params.name),
		self = this;

	fs.exists(repoPath, function(exists) {
		if(exists) return;
		self.checkPath(repoPath) && mkdirp(repoPath, function() {
			ghdownload(config.boilerplateRepo, repoPath).on('end', function() {
				self.readJSON(path.join(repoPath, 'package.json'), function(frapp) {
					frapp.name = params.name;
					frapp.version = '0.0.1';
					frapp.description = session.user.login + '\'s brand new Frapp';
					frapp.author = session.user.name + '<' + session.user.email + '>';
					frapp.repository = {
						type : 'git',
						url : 'https://github.com/' + session.user.login + '/' + params.name + '.git'
					};
					fs.writeFile(path.join(repoPath, 'package.json'), JSON.stringify(frapp, null, '\t'), function() {
						callback(frapp);
						//TODO: Create github repo, generate initial commit & push it.
						/*session.API.repos.create(params, function(err, repository) {
						
						});*/
					});
				});
			});
		});
	});
};

module.exports = new lib();
