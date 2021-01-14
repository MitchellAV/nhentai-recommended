const express = require("express");
const router = express.Router();
const dotenv = require("dotenv").config({ path: "./config.env" });
const puppeteer = require("puppeteer-extra");
const cheerio = require("cheerio");
const fs = require("fs").promises;

const { getBook, sleep } = require("../nhentai");

// add recaptcha plugin and provide it your 2captcha token (= their apiKey)
// 2captcha is the builtin solution provider but others would work as well.
// Please note: You need to add funds to your 2captcha account for this to work
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
puppeteer.use(
	RecaptchaPlugin({
		provider: {
			id: "2captcha",
			token: process.env.CAPCHA_API_KEY // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
		},
		visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
	})
);

router.get("/login", async (req, res) => {
	const browser = await puppeteer.launch({
		headless: false
	});
	const url = "https://nhentai.net/favorites/";

	await page.goto(url, { waitUntil: "domcontentloaded" });

	await page.type(
		"input[name='username_or_email']",
		process.env.NHENTAI_EMAIL
	);
	await page.type("input[name='password']", process.env.NHENTAI_PASSWORD);
	// // That's it, a single line of code to solve reCAPTCHAs 🎉
	await page.solveRecaptchas();

	await Promise.all([page.waitForNavigation(), page.click(`button`)]);
	await page.screenshot({
		fullPage: true,
		path: `./test.png`
	});
	// ... puppeteer code
	const cookies = await page.cookies();
	await fs.writeFile(
		"../json/personal/cookies.json",
		JSON.stringify(cookies, null, 2)
	);
	await browser.close();
	res.redirect("/favorites");
});

router.get("/favorites", async (req, res) => {
	try {
		const browser = await puppeteer.launch({
			headless: false
		});
		const page = await browser.newPage();
		const json = { favorites: [] };
		let pagenum = 1;
		let finished = false;
		while (!finished) {
			const url = `https://nhentai.net/favorites/?page=${pagenum}`;

			// ... puppeteer code
			const cookiesString = await fs.readFile(
				"../json/personal/cookies.json"
			);
			const cookies = JSON.parse(cookiesString);
			await page.setCookie(...cookies);
			await page.goto(url, { waitUntil: "domcontentloaded" });

			const content = await page.content();

			const $ = cheerio.load(content);

			const children = $("#favcontainer").children();
			for (let i = 0; i < children.length; i++) {
				const el = children[i];

				const fav_id = $(el).attr("data-id");
				if (fav_id !== undefined) {
					const book = await getBook(fav_id);
					console.log(`got book: ${fav_id}`);
					await sleep(10);
					json.favorites.push(book);
				} else {
					finished = true;
					break;
				}
			}
			pagenum++;
		}
		await fs.writeFile(
			"../json/personal/favorites.json",
			JSON.stringify(json)
		);

		await page.screenshot({
			fullPage: true,
			path: `../test.png`
		});
	} catch (err) {
		console.error(err);
	}
	favorites = require("../json/personal/favorites.json").favorites;

	res.end();
});
router.get("/tags", async (req, res) => {
	try {
		const browser = await puppeteer.launch({
			headless: false
		});
		const page = await browser.newPage();
		const json = { list: [] };

		for (let i = 1; i <= 191; i++) {
			const url = `https://nhentai.net/artists/popular?page=${i}`;

			// ... puppeteer code
			const cookiesString = await fs.readFile(
				"../json/personal/cookies.json"
			);
			const cookies = JSON.parse(cookiesString);
			await page.setCookie(...cookies);
			await page.goto(url, { waitUntil: "domcontentloaded" });

			const content = await page.content();

			const $ = cheerio.load(content);

			$("span.name").each(async (i, el) => {
				if ($(el).next("span.count").text() != 1) {
					const tag = $(el).text();
					json.list.push(tag);
				}
			});

			await page.screenshot({
				fullPage: true,
				path: `../test.png`
			});
		}
		await fs.writeFile(
			"../json/nhentai_metadata/artists.json",
			JSON.stringify(json)
		);
	} catch (err) {
		console.error(err);
	}
	res.end();
});

router.get("/blacklist", async (req, res) => {
	try {
		const browser = await puppeteer.launch({
			headless: false
		});
		const page = await browser.newPage();
		const json = { list: [] };

		const url = `https://nhentai.net/users/2343127/skater872/blacklist`;

		// ... puppeteer code
		const cookiesString = await fs.readFile(
			"../json/personal/cookies.json"
		);
		const cookies = JSON.parse(cookiesString);
		await page.setCookie(...cookies);
		await page.goto(url, { waitUntil: "domcontentloaded" });
		const content = await page.content();
		const $ = cheerio.load(content);

		$("span.name").each(async (i, el) => {
			if (!($(el).text().includes(":") || $(el).text().includes("+"))) {
				const tag = $(el).text();
				json.list.push(tag);
			}
		});

		await page.screenshot({
			fullPage: true,
			path: `../test.png`
		});

		await fs.writeFile(
			"../json/personal/blacklist.json",
			JSON.stringify(json)
		);
	} catch (err) {
		console.error(err);
	}
	blacklist = require("../json/personal/blacklist.json").list;

	res.end();
});
module.exports = router;
