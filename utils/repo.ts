/* eslint-disable import/no-extraneous-dependencies */
import { createWriteStream, promises as fs } from "fs";
import got from "got";
import { tmpdir } from "os";
import { join } from "path";
import { Stream } from "stream";
import tar from "tar";
import { promisify } from "util";

const pipeline = promisify(Stream.pipeline);

async function downloadTar(url: string) {
	const tempFile = join(tmpdir(), `create-that-monorepo.temp-${Date.now()}`);
	await pipeline(got.stream(url), createWriteStream(tempFile));
	return tempFile;
}

export async function downloadAndExtractRepo(root: string, filePath: string) {
	let branch = "main";

	const tempFile = await downloadTar(
		`https://codeload.github.com/J-Liciaga/that-monorepo/tar.gz/main`,
	);

	await tar.x({
		file: tempFile,
		cwd: root,
		strip: filePath ? filePath.split("/").length + 1 : 1,
		filter: p =>
			p.startsWith(
				`J-Liciaga-${branch.replace(/\//g, "-")}${
					filePath ? `/${filePath}/` : "/"
				}`,
			),
	});

	await fs.unlink(tempFile);
}
