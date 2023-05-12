const playwright = require("playwright");
const https = require("https");
const fs = require("fs");
const { log } = require("console");

const pageWithFiles =
	"https://ru.pinterest.com/Fatum9999/karakai-jouzu-no-takagi-san/";
const reliablePath = "result/";
let downloadAmount = 0;

(async () => {
	const browser = await playwright["chromium"].launch({ headless: true });
	const context = await browser.newContext({ acceptDownloads: true });
	const page = await context.newPage();
	await page.goto(pageWithFiles);
	downloadAmount !== 0 ? (downloadAmount += await page.$("h2")) : null;
	let scrList = [];
	for (let i = 0; i < 1000; i += 1) {
		scrList.push(...(await scan(page, i)));
	}
	let cleanedSrcList = clean(scrList);
	cleanedSrcList = getOriginals(cleanedSrcList);
	const txt = fs.createWriteStream(reliablePath + "href-list.txt");
	cleanedSrcList.map((el) => txt.write(el + `\n`));
	await download(cleanedSrcList, downloadAmount);
	await browser.close();
})();

const clean = (arr) => {
	return [...new Set(arr)];
};

const scan = async (page, i) => {
	await page.mouse.wheel(0, i * 2000);
	let srcList = await page.$$eval(
		"img:not([src*='75x75']):not([src*='70x'])",
		(el) => el.map((el) => el.src)
	);
	return srcList;
};

const getOriginals = (srcList) => {
	return srcList.map((el) => el.replace("236x", "originals"));
};

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
