import { execSync } from "node:child_process";

const patterns = [
  "apps/**/*.ts",
  "apps/**/*.tsx",
  "packages/**/*.ts",
  "packages/**/*.tsx"
];

let output = "";
try {
  output = execSync(
    `git grep -n ": any" -- ${patterns.map((p) => `"${p}"`).join(" ")}`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  );
} catch {
  console.log("check:no-any OK");
  process.exit(0);
}

if (output.trim()) {
  console.error("Forbidden `any` found:\n");
  console.error(output);
  process.exit(1);
}

console.log("check:no-any OK");
