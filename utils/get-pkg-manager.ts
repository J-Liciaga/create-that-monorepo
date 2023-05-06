export type PackageManager = "npm" | "yarn" | "pnpm";

export const getPackageManager = (): PackageManager => {
	const agent = process.env.npm_config_user_agent;

	if (agent) {
		if (agent.startsWith("pnpm")) return "pnpm";
		else if (agent.startsWith("yarn")) return "yarn";
		else return "npm";
	} else {
		return "npm";
	}
};
