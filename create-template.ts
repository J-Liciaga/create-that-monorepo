import retry from "async-retry";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import type { PackageManager } from "./utils/get-pkg-manager";
import { tryGitInit } from "./utils/git";
import { install } from "./utils/install";
import { isFolderEmpty } from "./utils/is-folder-empty";
import { getOnline } from "./utils/is-online";
import { isWriteable } from "./utils/is-writeable";
import { makeDir } from "./utils/make-dir";
import { downloadAndExtractRepo } from "./utils/repo";

export class DownloadError extends Error {}

export async function createApp({
	appPath,
	packageManager,
}: {
	appPath: string;
	packageManager: PackageManager;
}): Promise<void> {
	const root = path.resolve(appPath);

	if (!(await isWriteable(path.dirname(root)))) {
		console.error(
			"The application path is not writable, please check folder permissions and try again.",
		);
		console.error(
			"It is likely you do not have write permissions for this folder.",
		);
		process.exit(1);
	}

	const appName = path.basename(root);

	await makeDir(root);
	if (!isFolderEmpty(root, appName)) {
		process.exit(1);
	}

	const useYarn = packageManager === "yarn";
	const isOnline = !useYarn || (await getOnline());
	const originalDirectory = process.cwd();

	console.log(`Creating a new Next.js app in ${chalk.green(root)}.`);
	console.log();

	process.chdir(root);

	const packageJsonPath = path.join(root, "package.json");
	let hasPackageJson = false;

	try {
		console.log(`Downloading files from repo, This might take a moment...`);
		console.log();
		await retry(() => downloadAndExtractRepo(root, appPath), {
			// @ts-expect-error - Typings are wrong
			retries: 3,
		});
	} catch (reason) {
		function isErrorLike(err: unknown): err is { message: string } {
			return (
				typeof err === "object" &&
				err !== null &&
				typeof (err as { message?: unknown }).message === "string"
			);
		}
		throw new DownloadError(
			isErrorLike(reason) ? reason.message : reason + "",
		);
	}

	hasPackageJson = fs.existsSync(packageJsonPath);
	if (hasPackageJson) {
		console.log(
			"Installing packages. This might take a couple of minutes.",
		);
		console.log();

		await install(root, null, { packageManager, isOnline });
		console.log();
	}

	if (tryGitInit(root)) {
		console.log("Initialized a git repository.");
		console.log();
	}

	let cdpath: string;
	if (path.join(originalDirectory, appName) === appPath) {
		cdpath = appName;
	} else {
		cdpath = appPath;
	}

	console.log(`${chalk.green("Success!")} Created ${appName} at ${appPath}`);

	if (hasPackageJson) {
		console.log("Inside that directory, you can run several commands:");
		console.log();
		console.log(
			chalk.cyan(`  ${packageManager} ${useYarn ? "" : "run "}dev`),
		);
		console.log("    Starts the development server.");
		console.log();
		console.log(
			chalk.cyan(`  ${packageManager} ${useYarn ? "" : "run "}build`),
		);
		console.log("    Builds the app for production.");
		console.log();
		console.log(chalk.cyan(`  ${packageManager} start`));
		console.log("    Runs the built app in production mode.");
		console.log();
		console.log("We suggest that you begin by typing:");
		console.log();
		console.log(chalk.cyan("  cd"), cdpath);
		console.log(
			`  ${chalk.cyan(`${packageManager} ${useYarn ? "" : "run "}dev`)}`,
		);
	}
	console.log();
}
