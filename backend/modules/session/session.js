SESSION = {
	signin : function(callback) {
		if(this.data) return callback();
		if(callback) {
			!this.signinCallbacks && (this.signinCallbacks = []);
			this.signinCallbacks.push(callback);
		}
		FRAPP.signin();
	},
	onSignin : function(e) {
		this.data = e.detail.session;
		this.signinCallbacks && this.signinCallbacks.forEach(function(cb) {
			cb();
		});
		delete this.signinCallbacks;
	},
	signout : function(callback) {
		if(callback) {
			!this.signoutCallbacks && (this.signoutCallbacks = []);
			this.signoutCallbacks.push(callback);
		}
		FRAPP.signout();
	},
	onSignout : function() {
		delete this.data;
		this.signoutCallbacks && this.signoutCallbacks.forEach(function(cb) {
			cb();
		});
		delete this.signoutCallbacks;
	}
};

window.addEventListener('frapp.init', function(e) {
	/* Session init */
	e.detail.session && SESSION.onSignin(e);

	/* Session events */
	window.addEventListener('frapp.signin', SESSION.onSignin.bind(SESSION));
	window.addEventListener('frapp.signout', SESSION.onSignout.bind(SESSION));
});
