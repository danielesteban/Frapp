function Storage(namespace, window) {
	this.db = window.localStorage;
	this.namespace = namespace;
}

Storage.prototype.get = function(id, raw) {
	var item = this.db.getItem(this.namespace + ':' + id);
	return raw ? item : JSON.parse(item);
};

Storage.prototype.set = function(id, value, raw) {
	this.db.setItem(this.namespace + ':' + id, raw ? value : JSON.stringify(value));
};

Storage.prototype.remove = function(id) {
	this.db.removeItem(this.namespace + ':' + id);
};

Storage.prototype.clear = function() {
	for(var i in this.db) {
		i.indexOf(this.namespace + ':') === 0 && this.db.removeItem(i);
	}
};

module.exports = Storage;
