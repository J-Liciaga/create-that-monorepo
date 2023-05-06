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
	console.log("its lit!");
	const tempFile = join(tmpdir(), `create-that-monorepo.temp-${Date.now()}`);
	await pipeline(got.stream(url), createWriteStream(tempFile));
	return tempFile;
}

export async function downloadAndExtractRepo(root: string, filePath: string) {
	const tempFile = await downloadTar(
		`https://codeload.github.com/J-Liciaga/that-monorepo/tar.gz/main`,
	);

	await tar.x({
		file: tempFile,
		cwd: root,
		sync: true,
		strip: 1,
		filter: p => p.startsWith(`that-monorepo-main`),
	});

	await fs.unlink(tempFile);
}
