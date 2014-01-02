ROUTER = function(onUpdate) {
	this.onUpdate = onUpdate;
	var self = this;
	setTimeout(function() {
		self.update(location.hash.substr(1));
	}, 0);
};

ROUTER.prototype.update = function(url) {
	this.url = url;
	var p = url.indexOf('?'),
		panel = decodeURIComponent(p === -1 ? url : url.substr(0, p)),
		params = {};
	
	(p !== -1 ? url.substr(p + 1).split('&') : []).forEach(function(p, i) {
		p = p.split('=');
		params[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
	});
	this.onUpdate && this.onUpdate(panel, params);
};

ROUTER.prototype.reload = function() {
	this.update(this.url);
};

ROUTER.prototype.link = function(e) {
	var a = e.target;
	while(a.parentNode && a.tagName !== 'A') a = a.parentNode;
	if(!a.href || a.href.indexOf('#') === -1) return;
	e.preventDefault();
	var hash = a.href.substr(a.href.indexOf('#'));
	history.pushState(null, null, hash);
	this.update(hash.substr(1));
};

/* Handlebars helper */
window.Handlebars && Handlebars.registerHelper('a', function(text, panel, params, className, html) {
	text = L && L[text] ? L[text] : text;
	!html && (text = $('<div/>').text(text).html());
	var href;
	if(typeof panel === 'string') {
		href = '#' + encodeURIComponent(panel);
		if(typeof params === 'string') {
			href += '?';
			params = JSON.parse(params);
			var amp = '';
			for(var id in params) {
				href += amp + encodeURIComponent(id) + '=' + encodeURIComponent(params[id]);
				amp = '&';
			}
		}
	}
	return new Handlebars.SafeString('<a' + (href ? ' href="' + href + '" onclick="ROUTER.link && ROUTER.link(event)"' : '') + (typeof className === 'string' ? ' class="' + className + '"' : '') + '>' + text + '</a>');
});
