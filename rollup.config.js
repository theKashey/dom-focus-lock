'use strict';

const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const globals = require('rollup-plugin-node-globals');

module.exports = [{
	input: 'src/index.js',
	output: [
		{
			file: 'dist/index.js',
			format: 'cjs'
		},
		{
			file: 'dist/index.esm.js',
			format: 'esm'
		}
	],
	plugins: [
		babel({
			exclude: 'node_modules/**'
		})
	],
	external: [
		'focus-lock'
	]
}, {
	input: 'src/index.js',
	output: [
		{
			file: 'umd/index.js',
			format: 'umd',
			name: 'focusLock'
		}
	],
	plugins: [
		babel({
			exclude: 'node_modules/**'
		}),
		resolve(),
		commonjs(),
		globals()
	]
}];
