#!/usr/bin/env node

import chalk from "chalk";
import Commander from "commander";
import Conf from "conf";
import fs from "fs";
import path from "path";
import prompts from "prompts";
import checkForUpdate from "update-check";
import { createApp, DownloadError } from "./create-template";
import packageJson from "./package.json";
import { getPackageManager } from "./utils/get-pkg-manager";
import { isFolderEmpty } from "./utils/is-folder-empty";
import { validateNpmName } from "./utils/validate-pkg";

let projectPath: string = "";

const handleSigTerm = () => process.exit(0);

process.on("SIGINT", handleSigTerm);
process.on("SIGTERM", handleSigTerm);

const onPromptState = (state: any) => {
	if (state.aborted) {
		process.stdout.write("\x1B[?25h");
		process.stdout.write("\n");
		process.exit(1);
	}
};

const program = new Commander.Command(packageJson.name)
	.version(packageJson.version)
	.arguments("<project-directory>")
	.usage(`${chalk.green("<project-directory>")} [options]`)
	.action(name => {
		projectPath = name;
	})
	.option(
		"--use-npm",
		`

      Explicitly tell the CLI to bootstrap the application using npm
    `,
	)
	.option(
		"--use-pnpm",
		`

      Explicitly tell the CLI to bootstrap the application using pnpm
  `,
	)
	.allowUnknownOption()
	.parse(process.argv);

const packageManager = !!program.useNpm
	? "npm"
	: !!program.usePnpm
	? "pnpm"
	: getPackageManager();

async function run(): Promise<void> {
	const conf = new Conf({ projectName: "create-that-monorepo" });

	if (typeof projectPath === "string") {
		projectPath = projectPath.trim();
	}

	if (!projectPath) {
		const res = await prompts({
			onState: onPromptState,
			type: "text",
			name: "path",
			message: "What is your project named?",
			initial: "my-app",
			validate: name => {
				const validation = validateNpmName(
					path.basename(path.resolve(name)),
				);
				if (validation.valid) {
					return true;
				}
				return "Invalid project name: " + validation.problems![0];
			},
		});

		if (typeof res.path === "string") {
			projectPath = res.path.trim();
		}
	}

	if (!projectPath) {
		console.log(
			"\nPlease specify the project directory:\n" +
				`  ${chalk.cyan(program.name())} ${chalk.green(
					"<project-directory>",
				)}\n` +
				"For example:\n" +
				`  ${chalk.cyan(program.name())} ${chalk.green(
					"my-awesome-app",
				)}\n\n` +
				`Run ${chalk.cyan(
					`${program.name()} --help`,
				)} to see all options.`,
		);
		process.exit(1);
	}

	const resolvedProjectPath = path.resolve(projectPath);
	const projectName = path.basename(resolvedProjectPath);

	const { valid, problems } = validateNpmName(projectName);
	if (!valid) {
		console.error(
			`Could not create a project called ${chalk.red(
				`"${projectName}"`,
			)} because of npm naming restrictions:`,
		);

		problems!.forEach(p =>
			console.error(`    ${chalk.red.bold("*")} ${p}`),
		);
		process.exit(1);
	}

	const root = path.resolve(resolvedProjectPath);
	const appName = path.basename(root);
	const folderExists = fs.existsSync(root);

	if (folderExists && !isFolderEmpty(root, appName)) {
		process.exit(1);
	}

	const preferences = (conf.get("preferences") || {}) as Record<
		string,
		boolean | string
	>;

	try {
		await createApp({
			appPath: resolvedProjectPath,
			packageManager,
		});
	} catch (reason) {
		if (!(reason instanceof DownloadError)) {
			throw reason;
		}

		await createApp({
			appPath: resolvedProjectPath,
			packageManager,
		});
	}
	conf.set("preferences", preferences);
}

const update = checkForUpdate(packageJson).catch(() => null);

async function notifyUpdate(): Promise<void> {
	try {
		const res = await update;
		if (res?.latest) {
			const updateMessage =
				packageManager === "yarn"
					? "yarn global add create-that-monorepo"
					: packageManager === "pnpm"
					? "pnpm add -g create-that-monorepo"
					: "npm i -g create-that-monorepo";

			console.log(
				chalk.yellow.bold(
					"A new version of `create-that-monorepo` is available!",
				) +
					"\n" +
					"You can update by running: " +
					chalk.cyan(updateMessage) +
					"\n",
			);
		}
		process.exit();
	} catch (err) {
		console.error(`ERROR: ${err}`);
	}
}

run()
	.then(notifyUpdate)
	.catch(async reason => {
		console.log();
		console.log("Aborting installation.");
		if (reason.command) {
			console.log(`  ${chalk.cyan(reason.command)} has failed.`);
		} else {
			console.log(
				chalk.red("Unexpected error. Please report it as a bug:") +
					"\n",
				reason,
			);
		}
		console.log();

		await notifyUpdate();

		process.exit(1);
	});
