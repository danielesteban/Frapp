(function() {
	/* Lang detection/setup */
	var browser_lang = navigator.language.split('-'), lang;
	browser_lang.forEach(function(l) {
		l = l.toLowerCase();
		!lang && LANG[l] && (lang = l);
	});
	!lang && (lang = 'en') //the default
	window.L = LANG[lang];

	/* Handlebars helper */
	window.Handlebars && Handlebars.registerHelper('L', function(id) {
		return L[id] || id;
	});
})();
