var path = require('path'),
	resourcesPath = process.platform === 'darwin' ? path.join(process.cwd(), '..') : path.dirname(process.execPath),
	config = {
		frappManifest : 'https://raw.github.com/danielesteban/Frapp/master/app.nw/package.json',
		frappsPath : path.join(resourcesPath, 'frapps'),
		modulesPath : path.join(process.cwd(), 'frapp_modules'),
		resourcesPath : resourcesPath,
		sourcesPath : path.join(resourcesPath, 'sources'),
		storagePath : path.join(resourcesPath, 'storage'),
		boilerplateRepo : 'https://github.com/danielesteban/FrappBoilerplate.git',
		frappRepo : 'https://github.com/danielesteban/Frapp.git',
		installerRepo : 'https://github.com/danielesteban/FrappInstaller.git',
		menuRepo : 'https://github.com/danielesteban/FrappMenu.git',
		signinRepo : 'https://github.com/danielesteban/FrappSignin.git',
		frappUpdate : 'https://github.com/danielesteban/Frapp/releases/download/v{{version}}/Frapp-' + process.platform + (process.platform === 'linux' ? '-' + process.arch : '') + '.nw'
	};

module.exports = config;
