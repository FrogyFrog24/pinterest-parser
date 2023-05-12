const playwright = require("playwright");
const https = require("https");
const fs = require("fs");

const pageWithFiles = ""; // * Insert a link of a board to parse
const reliablePath = "result/"; // * Configure result path
let downloadAmount = 0; // * Configure amoutn of downloading pins (0 - all pins with additionals)

/* 
	* To parse all pins, you need to choose the number of repetitions of the scroll and its step

	Those settings allow to parse up to 1000 pins, in some cases code won't get all file 
	(ex. slow internet connection), play with values to get best result
*/
const scrollIterations = 1000;
const scrollIterationsStep = 1;
const scrollStep = 1000;

(async () => {
	const browser = await playwright["chromium"].launch({ headless: true });
	const context = await browser.newContext({ acceptDownloads: true });
	const page = await context.newPage();
	await page.goto(pageWithFiles);

	downloadAmount !== 0 ? (downloadAmount += await page.$("h2")) : null;

	let scrList = [];
	for (let i = 0; i < scrollIterations; i = i + scrollIterationsStep) {
		scrList.push(...(await scan(page, i)));
	}

	let cleanedSrcList = getOriginals(clean(scrList));

	await browser.close();

	createFileWithHrefs(cleanedSrcList);

	log("Downloading...");
	download(cleanedSrcList, downloadAmount);
})();

// * Remove duplications from href array
const clean = (arr) => {
	return [...new Set(arr)];
};

const createFileWithHrefs = (srcList) => {
	const txt = fs.createWriteStream(reliablePath + "href-list.txt");
	srcList.map((el, i) => txt.write(`${i}.${el}\n`));
};

// * Parse pins' srcs and scroll down
const scan = async (page, i) => {
	await page.mouse.wheel(0, i * scrollStep);
	let srcList = await page.$$eval(
		"img:not([src*='75x75']):not([src*='70x'])",
		(el) => el.map((el) => el.src)
	);
	return srcList;
};

// * Modify link to get origin resolution
const getOriginals = (srcList) => {
	return srcList.map((el) => el.replace("236x", "originals"));
};

// * Download pins
// In cases of errors with files' type here are some hadlers
// Looks awful, but it works :)
const download = async (srcList, downloadAmount) => {
	for (let j = 0; j < srcList.length; j++) {
		if (downloadAmount && j === downloadAmount - 1) break;

		https.get(srcList[j], function (response) {
			if (response.statusCode === 403) {
				if (srcList[j].lastIndexOf(".") !== -1)
					srcList[j] = srcList[j].replace(".jpg", ".png");
				else srcList[j] += ".png";

				logError(`${j}.StatusCode: ${response.statusCode}`);
				logInfo("downloading attempt 1...");

				https.get(srcList[j], function (response) {
					if (response.statusCode === 403) {
						srcList[j] = srcList[j].replace(".png", ".jpg");

						logError(`${j}.StatusCode  attempt 1: ${response.statusCode}`);
						logInfo("downloading attempt 2...");

						https.get(srcList[j], function (response) {
							if (response.statusCode === 403) {
								srcList[j] = srcList[j].replace(".jpg", ".gif");

								logError(`${j}.StatusCode  attempt 2: ${response.statusCode}`);
								logInfo("downloading attempt 3...");

								https.get(srcList[j], function (response) {
									if (response.statusCode === 403)
										logError(`${j}.Error with: ${srcList[j]}`);
									else {
										logSuccess(`${j}.StatusCode: ${response.statusCode}`);

										let file = fs.createWriteStream(reliablePath + j + ".gif");
										response.pipe(file);
									}
								});
							} else {
								logSuccess(`${j}.StatusCode: ${response.statusCode}`);

								let file = fs.createWriteStream(reliablePath + j + ".jpg");
								response.pipe(file);
							}
						});
					} else {
						logSuccess(`${j}.StatusCode: ${response.statusCode}`);

						let file = fs.createWriteStream(reliablePath + j + ".png");
						response.pipe(file);
					}
				});
			} else {
				logSuccess(`${j}.StatusCode: ${response.statusCode}`);
				let file = fs.createWriteStream(
					reliablePath + j + srcList[j].substr(-4, 4)
				);
				response.pipe(file);
			}
		});
	}
};

const logError = (payload) => {
	console.log("\x1b[31m", payload);
};

const logSuccess = (payload) => {
	console.log("\x1b[32m", payload);
};

const logInfo = (payload) => {
	console.log("\x1b[34m", payload);
};

const log = (payload) => {
	console.log("\x1b[0m", payload);
};
