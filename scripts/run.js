#!/usr/bin/env node
// Reads metford.config.json and invokes Alpakka with the right CLI flags.

import { spawnSync } from "child_process";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("metford.config.json", "utf-8"));

// Clean only the smali tree — leftover files from a previous run pollute the rebuild.
if (fs.existsSync("output/smali")) fs.rmSync("output/smali", { recursive: true, force: true });
fs.mkdirSync("reports", { recursive: true });

const args = ["alpakka", "classic", "dist/schemata.js", "-p", config.inputApk ?? "InputSources/"];
if (config.packageFilter) args.push("-f", config.packageFilter);

const result = spawnSync("npx", args, { stdio: "inherit" });
process.exit(result.status ?? 1);
