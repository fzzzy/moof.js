
require("child_process").spawn(
  "bash", ["-c", "cd dist && ./server"],
  {stdio: ["ignore", process.stdout, process.stderr]}
);
