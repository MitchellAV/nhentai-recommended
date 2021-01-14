const express = require("express");
const router = express.Router();
const math = require("mathjs");
const { convertVector } = require("../filter");
const { TF_IDF } = require("../tf-idf");
const { get_database, gen_ref_tags } = require("../util");

let favorites = require("../json/personal/favorites.json").favorites;
let blacklist = require("../json/personal/blacklist.json").list;
const database = [...get_database(0, Infinity)];

router.get("/recommend", async (req, res) => {
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
		database_TF_IDF_Vectors = require("../json/database_TF_IDF_Vectors.json")
			.list;
		if (database_TF_IDF_Vectors.length !== filtered_database.length) {
			throw new Error("Length different");
		}
	} catch (err) {
		database_TF_IDF_Vectors = TF_IDF(filtered_database, ref_tags);
		console.log("created TF-IDF database vectors");
		const json = { list: [...database_TF_IDF_Vectors] };
		await fs.writeFile(
			"../json/database_TF_IDF_Vectors.json",
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
	recommend.sort((a, b) => {
		return b.score - a.score;
	});
	console.log("sorted");
	res.json(recommend.slice(0, 100));
});
module.exports = router;
