

var gulp = require("gulp"),
  babel = require("gulp-babel"),
  nodemon = require("gulp-nodemon"),
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

gulp.task("transform", ["static", "copy scripts"], function () {
  return gulp.src(["**/*.js",
    "!static/**/*", "!node_modules/**/*", "!dist/**/*", "!gulpfile.js"])
    .pipe(babel())
    .pipe(gulp.dest("dist"));
});

gulp.task("default", ["transform"], function () {
  nodemon({
    script: "helper.js",
    ignore: ["dist", "**/node_modules"],
    ext: "html css png js",
    tasks: ["transform"]
  });
});
