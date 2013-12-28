var path = require('path'),
	config = {
		menuRepo : 'https://github.com/danielesteban/FrappsMenu.git',
		signinRepo : 'https://github.com/danielesteban/FrappSignin.git',
		frappsPath : path.join(process.cwd(), 'frapps')
	};

module.exports = config;
