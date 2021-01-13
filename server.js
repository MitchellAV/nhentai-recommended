const express = require("express");
const app = express();
const puppeteer = require("puppeteer-extra");
const { add, dot, norm } = require("mathjs");
const cheerio = require("cheerio");
const dotenv = require("dotenv").config({ path: "./config.env" });
const fs = require("fs").promises;
const { getBook, sleep, convertVector, TF_IDF } = require("./nhentai");

// add recaptcha plugin and provide it your 2captcha token (= their apiKey)
// 2captcha is the builtin solution provider but others would work as well.
// Please note: You need to add funds to your 2captcha account for this to work
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const { log } = require("console");
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
	try {
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
			.each(async (i, el) => {
				const book = $(el).attr("data-id");
				json.favorites.push(book);
			});

		for (let i = 0; i < json.favorites.length; i++) {
			const id = json.favorites[i];
			const book = await getBook(id);
			console.log("got book");
			await sleep(2000);
			console.log("done");
			json.favorites[i] = book;
		}

		await fs.writeFile("./favorites.json", JSON.stringify(json));

		await page.screenshot({
			fullPage: true,
			path: `./test.png`
		});
	} catch (err) {
		console.error(err);
	}
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
			const cookiesString = await fs.readFile("./cookies.json");
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
		await fs.writeFile("./artists.json", JSON.stringify(json));
	} catch (err) {
		console.error(err);
	}
	res.end();
});

const favorites = require("./favorites.json").favorites;
const all_tags = require("./tags.json").list;
const all_artists = require("./artists.json").list;
const all_characters = require("./characters.json").list;
const all_parodies = require("./parodies.json").list;
console.log(
	favorites.length,
	all_tags.length,
	all_artists.length,
	all_characters.length,
	all_parodies.length
);
const database1 = require("./json/10-1000-nhentai.json").posts;
const database2 = require("./json/2-1000-nhentai.json").posts;
const database3 = require("./json/3-1000-nhentai.json").posts;
const database4 = require("./json/4-1000-nhentai.json").posts;
const database5 = require("./json/5-1000-nhentai.json").posts;
const database6 = require("./json/6-1000-nhentai.json").posts;
const database = [
	...favorites,
	...database1,
	...database2,
	...database3,
	...database4,
	...database5,
	...database6
];

const gen_ref_tags = (database) => {
	let ref_tags = [];
	for (let i = 0; i < database.length; i++) {
		const book_tags = database[i].tags;
		for (let j = 0; j < book_tags.length; j++) {
			const tag = book_tags[j].name;
			if (!ref_tags.includes(tag)) {
				ref_tags.push(tag);
			}
		}
	}

	return ref_tags;
};
const ref_tags = gen_ref_tags(database);

app.get("/recommend", async (req, res) => {
	const filtered_fav = convertVector(favorites, ref_tags);
	console.log("created filtered fav");
	const fav_TF_IDF_Vectors = TF_IDF(filtered_fav, ref_tags);
	console.log("created TF-IDF fav vectors");
	const filtered_database = convertVector(database, ref_tags);
	console.log("created filtered database");
	let database_TF_IDF_Vectors;
	try {
		database_TF_IDF_Vectors = require("./database_TF_IDF_Vectors.json")
			.list;
	} catch (err) {
		database_TF_IDF_Vectors = TF_IDF(filtered_database, ref_tags);
		console.log("created TF-IDF database vectors");
		const json = { list: database_TF_IDF_Vectors };
		await fs.writeFile(
			"./database_TF_IDF_Vectors.json",
			JSON.stringify(json)
		);
	}

	let user_pref = Array(fav_TF_IDF_Vectors[0].length).fill(0);
	fav_TF_IDF_Vectors.forEach((vector) => {
		user_pref = user_pref.map((e, i) => e + vector[i]);
	});

	let max = norm(user_pref);
	user_pref = user_pref.map((x) => x / max);
	console.log("created user pref");
	const total = database_TF_IDF_Vectors.length;
	let recommend = [];
	database_TF_IDF_Vectors.forEach((vector, i) => {
		const user_norm = norm(user_pref);
		const book_norm = norm(vector);
		const dot_result = dot(user_pref, vector);
		const metric = dot_result / (user_norm * book_norm);
		const id = filtered_database[i].id;
		const num_pages = filtered_database[i].num_pages;
		const num_favorites = filtered_database[i].num_favorites;

		recommend.push({
			id,
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
			if (obj.id === target) {
				return true;
			}
		}
		return found;
	};

	recommend = recommend.filter((book) => !is_in_array(filtered_fav, book.id));

	console.log(`Filtered recommended`);

	console.log("weights assigned");
	recommend.sort(function (a, b) {
		return b.score - a.score;
	});
	console.log("sorted");
	res.json(recommend);
});

app.listen(3000, console.log("Yep"));
