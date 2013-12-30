var path = require('path'),
	config = {
		installerRepo : 'https://github.com/danielesteban/FrappInstaller.git',
		menuRepo : 'https://github.com/danielesteban/FrappsMenu.git',
		signinRepo : 'https://github.com/danielesteban/FrappSignin.git',
		frappsPath : path.join(process.platform === 'darwin' ? process.cwd() : path.dirname(process.execPath), 'frapps'),
		modulesPath : path.join(process.cwd(), 'backend', 'modules'),
		sourcesPath : path.join(process.platform === 'darwin' ? path.join(process.cwd(), 'backend') : path.dirname(process.execPath), 'sources')
	};

module.exports = config;
