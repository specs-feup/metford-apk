import fs from "fs";
import { runMutators, RunOptions } from "./runner.js";

const config = JSON.parse(fs.readFileSync("metford.config.json", "utf-8")) as RunOptions;
runMutators(config);
