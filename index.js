'use strict';
const fs = require('fs');
const path = require('path');
const dotProp = require('dot-prop');
const mkdirp = require('mkdirp');
const pkgUp = require('pkg-up');
const envPaths = require('env-paths');

const obj = () => Object.create(null);

// get the uncached parent
delete require.cache[__filename];
const parentDir = path.dirname(module.parent.filename);

class Conf {
	constructor(opts) {
		const pkgPath = pkgUp.sync(parentDir);
		opts = Object.assign({projectName: require(pkgPath).name}, opts);

		if (!opts.projectName) {
			throw new Error('Project name could not be inferred. Please specify the `projectName` option.');
		}

		// add some tests for these options
		opts = Object.assign({
			cwd: envPaths(opts.projectName).config,
			configName: 'config'
		}, opts);

		this.path = path.resolve(opts.cwd, `${opts.configName}.json`);
		this.store = Object.assign(obj(), opts.defaults, this.store);
	}
	get(key) {
		return dotProp.get(this.store, key);
	}
	set(key, val) {
		const store = this.store;

		if (val === undefined) {
			Object.keys(key).forEach(k => {
				dotProp.set(store, k, key[k]);
			});
		} else {
			dotProp.set(store, key, val);
		}

		this.store = store;
	}
	has(key) {
		return dotProp.has(this.store, key);
	}
	delete(key) {
		const store = this.store;
		dotProp.delete(store, key);
		this.store = store;
	}
	clear() {
		this.store = obj();
	}
	get size() {
		return Object.keys(this.store).length;
	}
	get store() {
		try {
			return Object.assign(obj(), JSON.parse(fs.readFileSync(this.path, 'utf8')));
		} catch (err) {
			if (err.code === 'ENOENT') {
				mkdirp.sync(path.dirname(this.path));
				return obj();
			}

			if (err.name === 'SyntaxError') {
				return obj();
			}

			throw err;
		}
	}
	set store(val) {
		// ensure the directory exists as it
		// could have been deleted in the meantime
		mkdirp.sync(path.dirname(this.path));

		fs.writeFileSync(this.path, JSON.stringify(val, null, '\t'));
	}
	// TODO: use `Object.entries()` here at some point
	* [Symbol.iterator]() {
		const store = this.store;

		for (const key of Object.keys(store)) {
			yield [key, store[key]];
		}
	}
}

module.exports = Conf;
