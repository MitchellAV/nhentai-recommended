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
const database = [...favorites, ...get_database(0, Infinity)];

console.log(favorites.length, blacklist.length, database.length);

router.get("/personal", async (req, res) => {
	let search = req.query.tag;
	let id = req.query.id;
	let search_list = [];
	search ? (search_list = [search]) : (search_list = []);
	const filterlist = {
		num_pages: -1,
		num_favorites: -1,
		tags: search_list
	};
	id ? (search = `${id}`) : (search = `${search}`);
	search ? (search = `${search}`) : (search = `${id}`);
	// filter databases
	let filtered_fav = cleanDatabase(favorites);
	console.log("created filtered fav");
	// const filtered_database = cleanDatabase(database);
	// console.log("created filtered database");

	let ref_tags = gen_ref_tags(filtered_fav);
	let searchedBook = filtered_fav;
	if (id) {
		for (let i = 0; i < filtered_fav.length; i++) {
			const book = filtered_fav[i];
			if (book.id == id) {
				searchedBook = [book];
				break;
			}
		}
	}

	const recommendation_list = await gen_recommendations(
		filtered_fav,
		searchedBook,
		ref_tags,
		filterlist,
		blacklist,
		100,
		"personal"
	);

	await scrapeThumbnails(recommendation_list);

	res.render("pages/recommended", {
		data: recommendation_list,
		search: search
	});
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
	ref_tags,
	filterlist,
	blacklist,
	num_results,
	type
) => {
	//  create vectors for database and personal
	// Jaccard similarity or Tf-idf
	// create personal vector
	const search_vectors = await TF_IDF(filtered_search, ref_tags, "favorites");

	// combine together to one vector
	let avg_search_vector = avg_vectors(search_vectors);
	// create database vector
	let database_vectors;
	if (type == "personal") {
		try {
			database_vectors = require("../json/favorite_TF_IDF_Vectors.json")
				.list;
			if (database_vectors.length !== filtered_database.length) {
				throw new Error("Length different");
			}
		} catch (err) {
			database_vectors = await TF_IDF(
				filtered_database,
				ref_tags,
				"database"
			);
			console.log("created TF-IDF favorite vectors");
			const json = { list: [...database_vectors] };
			await fs.writeFile(
				"./json/favorite_TF_IDF_Vectors.json",
				JSON.stringify(json)
			);
		}
	} else if (type == "database") {
		try {
			database_vectors = require("../json/database_TF_IDF_Vectors.json")
				.list;
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
	}

	let recommend;
	if (type == "personal") {
		try {
			recommend = require("../json/recommended-fav.json").list;
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
			await fs.writeFile(
				"./json/recommended-fav.json",
				JSON.stringify(json)
			);
		}
	} else if (type == "database") {
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
	}

	// compare user to database

	// order rankings
	recommend.sort((a, b) => {
		return b.score - a.score;
	});
	// filter rankings
	// remove favorited post
	if (type == "database") {
		recommend = recommend.filter(
			(book) => !is_in_array(filtered_search, book.title)
		);
	}

	recommend = filterDatabase(recommend, filterlist, blacklist);

	// return list of
	return recommend.slice(0, num_results);
};

router.get("/recommend", async (req, res) => {
	let search = req.query.tag;
	let id = parseInt(req.query.id);
	let search_list = [];
	search ? (search_list = [search]) : (search_list = []);
	const filterlist = {
		num_pages: -1,
		num_favorites: -1,
		tags: search_list
	};
	id ? (search = `${id}`) : (search = `${search}`);
	search ? (search = `${search}`) : (search = `${id}`);
	// filter databases
	let filtered_fav = cleanDatabase(favorites);
	console.log("created filtered fav");
	const filtered_database = cleanDatabase(database);
	console.log("created filtered database");

	let ref_tags = gen_ref_tags(filtered_fav);

	if (id) {
		for (let i = 0; i < filtered_database.length; i++) {
			const book = filtered_database[i];
			if (book.id == id) {
				filtered_fav = [book];
				break;
			}
		}
	}

	const recommendation_list = await gen_recommendations(
		filtered_database,
		filtered_fav,
		ref_tags,
		filterlist,
		blacklist,
		100,
		"database"
	);

	await scrapeThumbnails(recommendation_list);

	res.render("pages/recommended", {
		data: recommendation_list,
		search: search
	});
});
module.exports = router;
