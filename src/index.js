const playwright = require("playwright");
const https = require("https");
const fs = require("fs");
const { log } = require("console");

const pageWithFiles = "https://ru.pinterest.com/miraihancock/pins/"; // Insert a link of a board for parse
const reliablePath = "result/"; // Config result path
let downloadAmount = 0; // Configure amoutn of downloading pins (0 - all pins)

// To parse all pins, you need to choose the number of repetitions of the scroll and its step
// Those settings allow to parse up to 900 pins, in some cases code won't get all files, play with values to get best result
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
	for (let i = 0; i < scrollIterations; i += scrollIterationsStep) {
		scrList.push(...(await scan(page, i)));
	}

	let cleanedSrcList = clean(scrList);
	cleanedSrcList = getOriginals(cleanedSrcList);

	const txt = fs.createWriteStream(reliablePath + "href-list.txt");
	cleanedSrcList.map((el) => txt.write(el + `\n`));

	await download(cleanedSrcList, downloadAmount);
	await browser.close();
})();

// Remove duplications from href array
const clean = (arr) => {
	return [...new Set(arr)];
};

// Parse pins' srcs and scroll down
const scan = async (page, i) => {
	await page.mouse.wheel(0, i * scrollStep);
	let srcList = await page.$$eval(
		"img:not([src*='75x75']):not([src*='70x'])",
		(el) => el.map((el) => el.src)
	);
	return srcList;
};

// Get origin resolution
const getOriginals = (srcList) => {
	return srcList.map((el) => el.replace("236x", "originals"));
};

// Download pins
// * In cases of errors with files' type here are some hadlers
// * Looks awful, but it works :)
const download = async (srcList, downloadAmount) => {
	for (let j = 0; j < srcList.length; j++) {
		if (downloadAmount && j === downloadAmount - 1) break;

		https.get(srcList[j], function (response) {
			console.log(j + ".StatusCode:", response.statusCode);

			if (response.statusCode === 403) {
				if (srcList[j].lastIndexOf(".") !== -1)
					srcList[j] = srcList[j].replace(".jpg", ".png");
				else srcList[j] += ".png";

				console.log("retry downloading attempt 1...");

				https.get(srcList[j], function (response) {
					console.log(j + ".StatusCode attempt 1:", response.statusCode);

					if (response.statusCode === 403) {
						srcList[j] = srcList[j].replace(".png", ".jpg");

						console.log("retry downloading attempt 2...");

						https.get(srcList[j], function (response) {
							console.log(j + ".StatusCode attempt 2:", response.statusCode);

							if (response.statusCode === 403) {
								srcList[j] = srcList[j].replace(".jpg", ".gif");

								console.log("retry downloading attempt 3...");

								https.get(srcList[j], function (response) {
									if (response.statusCode === 403)
										console.log(j + ".Error with:", srcList[j]);
									else {
										console.log(
											j + ".StatusCode attempt 3:",
											response.statusCode
										);
										{
											let file = fs.createWriteStream(
												reliablePath + j + ".gif"
											);
											response.pipe(file);
										}
									}
								});
							} else {
								let file = fs.createWriteStream(reliablePath + j + ".jpg");
								response.pipe(file);
							}
						});
					} else {
						let file = fs.createWriteStream(reliablePath + j + ".png");
						response.pipe(file);
					}
				});
			} else {
				let file = fs.createWriteStream(
					reliablePath + j + srcList[j].substr(-4, 4)
				);
				response.pipe(file);
			}
		});
	}
};
