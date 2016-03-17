var gulp = require('gulp');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var plumber = require('gulp-plumber');
var rename = require('gulp-rename');
var requirejs = require('gulp-requirejs');
var closureCompiler = require('google-closure-compiler').gulp();

var scss_files = [
  'sass/circuit.scss',
  'sass/index.scss',
];

gulp.task('sass', function () {
  gulp.src(scss_files)
      .pipe(plumber())
      .pipe(sass({outputStyle: 'compressed'}))
      .pipe(autoprefixer())
      .pipe(concat('unified.min.css'))
      .pipe(gulp.dest('css/'));
});

gulp.task('js-requirejs', function () {
  requirejs({
    baseUrl: 'js',
    name: 'main',
    out: 'unified.js',
    paths: {
      jquery: 'empty:'
    },
  }).pipe(gulp.dest('js/unified/'));
});

gulp.task('js-compile', function () {
  gulp.src('js/unified/unified.js')
      .pipe(plumber())
      .pipe(closureCompiler({
        compilation_level: 'ADVANCED',
        warning_level: 'VERBOSE',
        externs: [
          'externs/require.2.1.22.js',
          'externs/jquery-1.9.js'
        ],
        hide_warnings_for: 'externs/',
        language_in: 'ECMASCRIPT6_STRICT',
        language_out: 'ECMASCRIPT5_STRICT',
        js_output_file: 'unified.min.js'
      }))
      .pipe(gulp.dest('js/unified/'));
});

gulp.task('default', ['sass', 'js-requirejs'], function () {
  gulp.watch(scss_files, ['sass']);
  gulp.watch(['js/**/*.js', '!js/unified/**/*.js'], ['js-requirejs']);
  gulp.watch(['js/unified/unified.js'], ['js-compile']);
});
