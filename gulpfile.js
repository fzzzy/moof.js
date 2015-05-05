

var gulp = require("gulp"),
  babel = require("gulp-babel"),
  run = require("gulp-run");

gulp.task("clean", function () {
  run("rm -rf dist").exec();
});

gulp.task("static", function () {
  return gulp.src("static/**/*")
    .pipe(gulp.dest("dist/static"));
});

gulp.task("copy scripts", function () {
  return gulp.src(["run_tests", "server"]).
    pipe(gulp.dest("dist"));
});

gulp.task("default", ["static", "copy scripts"], function () {
  return gulp.src(["**/*.js",
    "!static/**/*", "!node_modules/**/*", "!dist/**/*", "!gulpfile.js"])
    .pipe(babel())
    .pipe(gulp.dest("dist"));
});
