const express = require("express");
const router = express.Router();
const math = require("mathjs");
const fs = require("fs").promises;

const { filterDatabase, cleanDatabase } = require("../filter");
const { TF_IDF } = require("../tf-idf");
const { get_database, gen_ref_tags } = require("../util");
const { scrapeThumbnails } = require("../nhentai.js");

let favorites = require("../json/personal/favorites.json").favorites;
let blacklist = require("../json/personal/blacklist.json").list;
const database = [...get_database(0, Infinity)];

console.log(favorites.length, blacklist.length, database.length);

router.get("/personal", async (req, res) => {
	const filtered_fav = cleanDatabase(favorites);
	const ref_tags = gen_ref_tags(filtered_fav);
	const fav_TF_IDF_Vectors = await TF_IDF(filtered_fav, ref_tags);
	let avg_search_vector = avg_vectors(fav_TF_IDF_Vectors);
	let recommend = [];
	fav_TF_IDF_Vectors.forEach((vector, i) => {
		const score = cosine_similarity(avg_search_vector, vector);

		let book = { ...filtered_fav[i], score };

		recommend.push(book);
	});

	recommend.sort((a, b) => {
		return b.score - a.score;
	});

	res.json(recommend);
});

const avg_vectors = (vectors) => {
	let sum_vectors = Array(vectors[0].length).fill(0);
	vectors.forEach((vector) => {
		sum_vectors = sum_vectors.map((e, i) => e + vector[i]);
	});

	let max = math.norm(sum_vectors);
	let avg_vector = sum_vectors.map((x) => x / max);
	return avg_vector;
};
const cosine_similarity = (vectorA, vectorB) => {
	const a_norm = math.norm(vectorA);
	const b_norm = math.norm(vectorB);
	const dot_result = math.dot(vectorA, vectorB);
	const score = dot_result / (a_norm * b_norm);
	return score;
};

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

const gen_recommendations = async (
	filtered_database,
	filtered_search,
	filterlist,
	blacklist,
	num_results
) => {
	let ref_tags = gen_ref_tags(filtered_search);

	//  create vectors for database and personal
	// Jaccard similarity or Tf-idf
	// create personal vector
	const search_vectors = await TF_IDF(filtered_search, ref_tags, "favorites");

	// combine together to one vector
	let avg_search_vector = avg_vectors(search_vectors);
	// create database vector
	let database_vectors;

	try {
		database_vectors = require("../json/database_TF_IDF_Vectors.json").list;
		if (database_vectors.length !== filtered_database.length) {
			throw new Error("Length different");
		}
	} catch (err) {
		database_vectors = await TF_IDF(
			filtered_database,
			ref_tags,
			"database"
		);
		console.log("created TF-IDF database vectors");
		const json = { list: [...database_vectors] };
		await fs.writeFile(
			"./json/database_TF_IDF_Vectors.json",
			JSON.stringify(json)
		);
	}

	let recommend;

	try {
		recommend = require("../json/recommended.json").list;
		if (recommend.length !== filtered_database.length) {
			throw new Error("Length different");
		}
	} catch (err) {
		const total = database_vectors.length;
		recommend = [];
		database_vectors.forEach((vector, i) => {
			const score = cosine_similarity(avg_search_vector, vector);

			let book = { ...filtered_database[i], score };

			recommend.push(book);
			console.log(`Scored ${i + 1}/${total}`);
		});
		console.log("created recommended");
		const json = { list: [...recommend] };
		await fs.writeFile("./json/recommended.json", JSON.stringify(json));
	}
	// compare user to database

	// order rankings
	recommend.sort((a, b) => {
		return b.score - a.score;
	});
	// filter rankings
	// remove favorited post
	recommend = recommend.filter(
		(book) => !is_in_array(filtered_search, book.title)
	);

	recommend = filterDatabase(recommend, filterlist, blacklist);

	// return list of
	return recommend.slice(0, num_results);
};

router.get("/recommend/:tag", async (req, res) => {
	const search = req.params.tag;
	const filterlist = {
		num_pages: -1,
		num_favorites: -1,
		tags: [search]
	};
	// filter databases
	const filtered_fav = cleanDatabase(favorites);
	console.log("created filtered fav");
	const filtered_database = cleanDatabase(database);
	console.log("created filtered database");
	const recommendation_list = await gen_recommendations(
		filtered_database,
		filtered_fav,
		filterlist,
		blacklist,
		100
	);

	await scrapeThumbnails(recommendation_list);

	res.render("pages/recommended", { data: recommendation_list });
	// res.json(recommendation_list);
});
module.exports = router;
