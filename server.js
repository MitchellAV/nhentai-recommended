const express = require("express");
const app = express();
const puppeteer = require("puppeteer-extra");
const math = require("mathjs");
const cheerio = require("cheerio");
const dotenv = require("dotenv").config({ path: "./config.env" });
const fs = require("fs").promises;
const fsSync = require("fs");

const { getBook, sleep, convertVector, TF_IDF } = require("./nhentai");

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
		"./json/personal/cookies.json",
		JSON.stringify(cookies, null, 2)
	);
	await browser.close();
	res.redirect("/favorites");
});

app.get("/favorites", async (req, res) => {
	try {
		const browser = await puppeteer.launch({
			headless: false
		});
		const page = await browser.newPage();
		const json = { favorites: [] };
		for (let i = 1; i <= 3; i++) {
			const url = `https://nhentai.net/favorites/?page=${i}`;

			// ... puppeteer code
			const cookiesString = await fs.readFile(
				"./json/personal/cookies.json"
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
				const book = await getBook(fav_id);
				console.log(`got book: ${fav_id}`);
				await sleep(10);

				json.favorites.push(book);
			}
		}
		await fs.writeFile(
			"./json/personal/favorites.json",
			JSON.stringify(json)
		);

		await page.screenshot({
			fullPage: true,
			path: `./test.png`
		});
	} catch (err) {
		console.error(err);
	}
	favorites = require("./json/personal/favorites.json").favorites;

	res.end();
});

app.get("/book/:id", async (req, res) => {
	const bookID = req.params.id;
	const book = await getBook(bookID);
	console.log(book);
	console.log("start");
	await sleep(5000);
	console.log("end");

	res.json(book);
});

app.get("/tags", async (req, res) => {
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
				"./json/personal/cookies.json"
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
				path: `./test.png`
			});
		}
		await fs.writeFile(
			"./json/nhentai_metadata/artists.json",
			JSON.stringify(json)
		);
	} catch (err) {
		console.error(err);
	}
	res.end();
});

app.get("/blacklist", async (req, res) => {
	try {
		const browser = await puppeteer.launch({
			headless: false
		});
		const page = await browser.newPage();
		const json = { list: [] };

		const url = `https://nhentai.net/users/2343127/skater872/blacklist`;

		// ... puppeteer code
		const cookiesString = await fs.readFile("./json/personal/cookies.json");
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
			path: `./test.png`
		});

		await fs.writeFile(
			"./json/personal/blacklist.json",
			JSON.stringify(json)
		);
	} catch (err) {
		console.error(err);
	}
	blacklist = require("./json/personal/blacklist.json").list;

	res.end();
});

let favorites = require("./json/personal/favorites.json").favorites;
let blacklist = require("./json/personal/blacklist.json").list;
const get_database = (start, stop) => {
	const files = fsSync.readdirSync("./json/database/");
	let database = [];
	start = start > files.length ? files.length : start;
	stop = stop + 1 > files.length ? files.length : stop + 1;
	console.log(start, stop);

	for (let i = start; i < stop; i++) {
		const file = files[i];
		console.log(file);
		let datapart = require(`./json/database/${file}`).posts;
		database = [...database, ...datapart];
		console.log(i);
	}

	return database;
};
const database = [...get_database(28, 78)];
const combination = (array) => {
	let results = [];
	// Since you only want pairs, there's no reason
	// to iterate over the last element directly
	for (let i = 0; i < array.length - 1; i++) {
		// This is where you'll capture that last value
		for (let j = i + 1; j < array.length; j++) {
			results.push(`${array[i]} ${array[j]}`);
		}
	}
	return results;
};
const gen_ref_tags = (database) => {
	let ref_tags = [];
	for (let i = 0; i < database.length; i++) {
		const book_tags = database[i].tags;
		for (let j = 0; j < book_tags.length; j++) {
			const tag = book_tags[j];
			if (!ref_tags.includes(tag)) {
				ref_tags.push(tag);
			}
		}
	}
	// ref_tags = combination(ref_tags);
	return ref_tags;
};

app.get("/recommend", async (req, res) => {
	const filterlist = {
		num_pages: 300,
		num_favorites: 500,
		tags: []
	};
	const filtered_fav = convertVector(favorites, blacklist);
	console.log("created filtered fav");
	const filtered_database = convertVector(database, blacklist, filterlist);
	console.log("created filtered database");
	const ref_tags = gen_ref_tags(filtered_fav);
	console.log("created ref_tags");
	const fav_TF_IDF_Vectors = TF_IDF(filtered_fav, ref_tags);
	console.log("created TF-IDF fav vectors");
	let database_TF_IDF_Vectors;
	try {
		database_TF_IDF_Vectors = require("./json/database_TF_IDF_Vectors.json")
			.list;
		if (database_TF_IDF_Vectors.length !== filtered_database.length) {
			throw new Error("Length different");
		}
	} catch (err) {
		database_TF_IDF_Vectors = TF_IDF(filtered_database, ref_tags);
		console.log("created TF-IDF database vectors");
		const json = { list: [...database_TF_IDF_Vectors] };
		await fs.writeFile(
			"./json/database_TF_IDF_Vectors.json",
			JSON.stringify(json)
		);
	}

	let user_pref = Array(fav_TF_IDF_Vectors[0].length).fill(0);
	fav_TF_IDF_Vectors.forEach((vector) => {
		user_pref = user_pref.map((e, i) => e + vector[i]);
	});

	let max = math.norm(user_pref);
	user_pref = user_pref.map((x) => x / max);
	console.log("created user pref");
	const total = database_TF_IDF_Vectors.length;
	let recommend = [];
	database_TF_IDF_Vectors.forEach((vector, i) => {
		const user_norm = math.norm(user_pref);
		const book_norm = math.norm(vector);
		const dot_result = math.dot(user_pref, vector);
		const metric = dot_result / (user_norm * book_norm);
		const id = filtered_database[i].id;
		const num_pages = filtered_database[i].num_pages;
		const num_favorites = filtered_database[i].num_favorites;
		const title = filtered_database[i].title;

		recommend.push({
			id,
			title,
			num_pages,
			num_favorites,
			url: `https://nhentai.net/g/${id}`,
			score: metric
		});
		console.log(`Created ${i + 1}/${total}`);
	});

	const is_in_array = (array, target) => {
		let found = false;
		for (let i = 0; i < array.length; i++) {
			const obj = array[i];
			if (obj.title === target) {
				return true;
			}
		}
		return found;
	};

	// const find_duplicates = (array, item) => {
	// 	for (let i = 0; i < array.length; i++) {
	// 		const element = array[i];
	// 	}
	// };

	recommend = recommend.filter(
		(book) => !is_in_array(filtered_fav, book.title)
	);

	// recommend = recommend.filter((book) => !is_in_array(recommend, book.title));
	console.log(`Filtered recommended`);

	console.log("weights assigned");
	recommend.sort(function (a, b) {
		return b.score - a.score;
	});
	console.log("sorted");
	res.json(recommend.slice(0, 100));
});

app.listen(3000, console.log("Yep"));
