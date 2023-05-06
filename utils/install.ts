/* eslint-disable import/no-extraneous-dependencies */
import chalk from "chalk";
import spawn from "cross-spawn";
import type { PackageManager } from "./get-pkg-manager";

interface InstallArgs {
	packageManager: PackageManager;
	isOnline: boolean;
	devDependencies?: boolean;
}

export function install(
	root: string,
	dependencies: string[] | null,
	{ packageManager, isOnline, devDependencies }: InstallArgs,
): Promise<void> {
	const npmFlags: string[] = [];
	const yarnFlags: string[] = [];

	return new Promise((resolve, reject) => {
		let args: string[];
		let command = packageManager;
		const useYarn = packageManager === "yarn";

		if (dependencies && dependencies.length) {
			if (useYarn) {
				args = ["add", "--exact"];
				if (!isOnline) args.push("--offline");
				args.push("--cwd", root);
				if (devDependencies) args.push("--dev");
				args.push(...dependencies);
			} else {
				args = ["install", "--save-exact"];
				args.push(devDependencies ? "--save-dev" : "--save");
				args.push(...dependencies);
			}
		} else {
			args = ["install"];
			if (!isOnline) {
				console.log(chalk.yellow("You appear to be offline."));
				if (useYarn) {
					console.log(
						chalk.yellow("Falling back to the local Yarn cache."),
					);
					console.log();
					args.push("--offline");
				} else {
					console.log();
				}
			}
		}
		if (useYarn) {
			args.push(...yarnFlags);
		} else {
			args.push(...npmFlags);
		}
		const child = spawn(command, args, {
			stdio: "inherit",
			env: {
				...process.env,
				ADBLOCK: "1",
				NODE_ENV: "development",
				DISABLE_OPENCOLLECTIVE: "1",
			},
		});
		child.on("close", code => {
			if (code !== 0) {
				reject({ command: `${command} ${args.join(" ")}` });
				return;
			}
			resolve();
		});
	});
}
