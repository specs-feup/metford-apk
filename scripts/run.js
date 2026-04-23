#!/usr/bin/env node
// Reads metford.config.json and invokes Alpakka with the right CLI flags.

import { spawnSync } from "child_process";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("metford.config.json", "utf-8"));

const args = ["alpakka", "classic", "dist/schemata.js", "-p", config.inputApk ?? "InputSources/"];
if (config.packageFilter) args.push("-f", config.packageFilter);

const result = spawnSync("npx", args, { stdio: "inherit" });
process.exit(result.status ?? 1);
