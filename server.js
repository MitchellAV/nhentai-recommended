const express = require("express");
const app = express();
const puppeteer = require("puppeteer-extra");
const cheerio = require("cheerio");
const dotenv = require("dotenv").config({ path: "./config.env" });
const fs = require("fs").promises;

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

app.get("/login", async (req, res) => {
	const browser = await puppeteer.launch({
		headless: false
	});
	const url = "https://nhentai.net/favorites/";

	await page.goto(url, { waitUntil: "domcontentloaded" });

	await page.type(
		"input[name='username_or_email']",
		"mitchellvictoriano@gmail.com"
	);
	await page.type("input[name='password']", "Mockingjay96");
	// // That's it, a single line of code to solve reCAPTCHAs 🎉
	await page.solveRecaptchas();

	await Promise.all([page.waitForNavigation(), page.click(`button`)]);
	await page.screenshot({
		fullPage: true,
		path: `./test.png`
	});
	// ... puppeteer code
	const cookies = await page.cookies();
	await fs.writeFile("./cookies.json", JSON.stringify(cookies, null, 2));
	await browser.close();
	res.redirect("/favorites");
});

app.get("/favorites", async (req, res) => {
	const browser = await puppeteer.launch({
		headless: false
	});
	const url = "https://nhentai.net/favorites/";

	// ... puppeteer code
	const page = await browser.newPage();
	const cookiesString = await fs.readFile("./cookies.json");
	const cookies = JSON.parse(cookiesString);
	await page.setCookie(...cookies);
	await page.goto(url, { waitUntil: "domcontentloaded" });

	const content = await page.content();

	const $ = cheerio.load(content);

	const json = { favorites: [] };

	$("#favcontainer")
		.children()
		.each((i, el) => {
			const book = { id: $(el).attr("data-id") };
			json.favorites.push(book);
		});
	await fs.writeFile("./favorites.json", JSON.stringify(json));

	await page.screenshot({
		fullPage: true,
		path: `./test.png`
	});
	res.end();
});

app.listen(3000, console.log("Yep"));
