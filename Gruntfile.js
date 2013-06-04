"use strict";

module.exports = function(grunt) {

	var GCC_OPTIONS = {
		compilation_level: "SIMPLE_OPTIMIZATIONS",
		externs: "tools/extern.js",

		warning_level: "VERBOSE",
		jscomp_off: "checkTypes",
		jscomp_error: "checkDebuggerStatement"
	};

	var CONFIG_FILES = [
		'Gruntfile.js'
	];
	var CLIENT_FILES = [
		'base/*/*.js',
		'base/*.js',
		'core/*.js'
	];

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),

		jshint: {
			config: {
				files: {
					src: CONFIG_FILES
				},
				options: {
					node: true,
					es5: true
				}
			},
			client: CLIENT_FILES,
			options: {
				asi:true,
				curly:true,
				latedef:true,
				forin:false,
				noarg:false,
				sub:true,
				undef:true,
				unused:'vars',
				boss:true,
				eqnull:true,
				browser:true,
				laxcomma:true,
				devel:true,
				smarttabs:true,
				predef:[
					"require"
					,"define"
					,"console"
					,"extend"
					,"LANG"
					,"_T"
					,"seajs"
				],
				globals: {
					jQuery: true
					,browser:true
				}
			}
		},
		concat: {
			client: {
				src: [
					"client/src/main.js"
				],
				dest: "dist/client-debug.js"
			}
		},
		less: {
			dev: {
				files:{
					'resources/css/app.css': 'resources/css/app.less'
				}
			},
			product:{
				files:{
					'resources/css/app.css': 'resources/css/app.less'
				},
				options:{
					yuicompress: true
				}
			},
			options: {
				paths: ['resources/css']
			}
		},
		watch: {
			config: {
				files: CONFIG_FILES,
				tasks: ['jshint:config']
			},
			client: {
				files: CLIENT_FILES,
				tasks: ['jshint:client']
			},
			less: {
				files: [
					'resources/css/app.less',
					'less/**/*.less'
				],
				tasks: ['less:dev']
			}
		},
		gcc: {
			client: {
				src: "dist/client-debug.js",
				dest: "dist/client.js",
				options: grunt.util._.merge({
					source_map_format: "V3",
					create_source_map: "dist/client.js.map"
				}, GCC_OPTIONS)
			}
		}
	});

	grunt.registerTask("embed", "Embed version etc.", function() {
		var configs = grunt.config("concat");
		var version = grunt.config("pkg.version");
		var code, name;

		for (name in configs){
			name = configs[name].dest;
			code = grunt.file.read(name);
			code = code.replace(/@VERSION/g, version);
			grunt.file.write(name, code);
		}

		grunt.log.writeln("@VERSION is replaced to \"" + version + "\".");
	});

	grunt.registerTask("fix", "Fix sourceMap etc.", function() {
		var configs = grunt.config('gcc');
		var code, name, mapfile, minfile, srcfile;
		var mapname, minname, srcname;

		for (name in configs){
			mapfile = configs[name].options.create_source_map;
			minfile = configs[name].dest;
			srcfile = configs[name].src;

			mapname = mapfile.split("/").pop();
			minname = minfile.split("/").pop();
			srcname = srcfile.split("/").pop();

			code = grunt.file.read(mapfile);
			code = code.replace('"file":""', '"file":"' + minname + '"');
			code = code.replace(srcfile, srcname);
			code = code.replace(srcfile.replace(/[\/]+/g, '\\\\'), srcname);
			grunt.file.write(mapfile, code);
			grunt.log.writeln('"' + mapfile + '" is fixed.');

			code = grunt.file.read(minfile);
			code += "//@ sourceMappingURL=" + mapname + "\n";
			grunt.file.write(minfile, code);
			grunt.log.writeln('"' + minfile + '" is fixed.');
		}
	});

	grunt.registerMultiTask("gcc", "Minify files with GCC.", function() {
		var done = this.async();

		var options = this.options({ banner: "" });
		var gccOptions = {};

		var banner = options.banner;
		banner = grunt.template.process(banner ? banner + "\n" : "");

		// Parse options
		Object.keys(options).forEach(function(key) {
			if (key !== "banner") {
				gccOptions[key] = options[key];
			}
		});

		var files = this.files;

		// Iterate over all src-dest file pairs
		function next() {
			var file = files.shift();
			if (file) {
				minify(file);
			}else {
				done();
			}
		}

		// Error handler
		function failed(error) {
			grunt.log.error();
			grunt.verbose.error(error);
			grunt.fail.warn('Google Closure Compiler failed.');
			done();
		}

		function minify(file) {
			var source = file.src.filter(function(filepath) {
				var bool = grunt.file.exists(filepath);

				// Warn on and remove invalid source files
				if (!bool) {
					grunt.log.warn('Source file "' + filepath + '" not found.');
				}
				return bool;
			});

			// Minify files, warn and fail on error
			var result = ""
			try {
				require("gcc").compile(source, gccOptions, function(error, stdout) {
					if (error) {
						failed(error);
						return;
					}

					result = banner + stdout;
					grunt.file.write(file.dest, result);
					grunt.log.writeln('File `' + file.dest + '` created.');

					// Task completed
					next();
				});
			}
			catch (error) {
				failed(error);
			}
		}

		next();
	});

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-less');

	// "npm test" runs these tasks
	grunt.registerTask('test', ['jshint']);
	grunt.registerTask('test-client', ['jshint:client']);

	// Less compile
	grunt.registerTask('less-product', ['less:product']);

	// Watch tasks
	grunt.registerTask('watch-all', ['jshint','watch']);
	grunt.registerTask('watch-client', ['jshint:client','watch:client']);

	// Build task
	grunt.registerTask('build', ['less-product']);

	// Default task.
	grunt.registerTask('default', ['watch-all']);

	// default force mode
	grunt.option('force', true);
};