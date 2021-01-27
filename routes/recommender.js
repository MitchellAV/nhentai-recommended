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

let filtered_fav = cleanDatabase(favorites);
console.log("created filtered fav");
const filtered_database = cleanDatabase(database);
console.log("created filtered database");

router.get("/personal", async (req, res) => {
	// let id = parseInt(req.query.id);
	// search ? (search_list = [search]) : (search_list = []);

	// id ? (search = `${id}`) : (search = `${search}`);
	// search ? (search = `${search}`) : (search = `${id}`);
	// // filter databases

	let ref_tags = await gen_ref_tags(filtered_fav);

	// ref_tags = gen_ref_tags(filtered_database);

	let search_vector_name = "favorites";

	let favorites_TF_IDF_Vectors = await get_Favorites_TF_IDF_Vectors(
		filtered_fav,
		ref_tags
	);

	let search_vector = avg_vectors(favorites_TF_IDF_Vectors);

	let recommended_list = await get_recommended(
		search_vector,
		favorites_TF_IDF_Vectors,
		filtered_fav,
		search_vector_name
	);

	let ignore_list = [];
	let search = req.query.tag;
	let search_list = [];
	search ? (search_list = [search]) : (search_list = []);

	const filterlist = {
		num_pages: -1,
		num_favorites: -1,
		tags: search_list
	};
	const filtered_recommended_list = filter_recommended(
		recommended_list,
		ignore_list,
		filterlist,
		blacklist,
		100,
		"database"
	);

	await scrapeThumbnails(filtered_recommended_list);

	res.render("pages/recommended", {
		data: filtered_recommended_list,
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

const get_Database_TF_IDF_Vectors = async (filtered_database, ref_tags) => {
	let database_vectors;
	try {
		database_vectors = require("../json/database_TF_IDF_Vectors.json").list;
		if (
			database_vectors.length !== filtered_database.length ||
			database_vectors[0].length !== ref_tags.length
		) {
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

	return database_vectors;
};
const get_Favorites_TF_IDF_Vectors = async (filtered_fav, ref_tags) => {
	let database_vectors;
	try {
		database_vectors = require("../json/favorites_TF_IDF_Vectors.json")
			.list;
		if (
			database_vectors.length !== filtered_fav.length ||
			database_vectors[0].length !== ref_tags.length
		) {
			throw new Error("Length different");
		}
	} catch (err) {
		database_vectors = await TF_IDF(filtered_fav, ref_tags, "favorites");
		console.log("created Favorites TF-IDF database vectors");
		const json = { list: [...database_vectors] };
		await fs.writeFile(
			"./json/favorites_TF_IDF_Vectors.json",
			JSON.stringify(json)
		);
	}

	return database_vectors;
};
const get_recommended = async (
	single_vector,
	database_vectors,
	database,
	name
) => {
	let recommend;
	try {
		if (name == "id") {
			throw new Error("Don't save id searches");
		}
		recommend = require(`../json/${name}-recommended.json`).list;
		if (recommend.length !== database_vectors.length) {
			throw new Error("Length different");
		}
	} catch (err) {
		recommend = [];
		const total = database_vectors.length;
		for (let i = 0; i < database_vectors.length; i++) {
			const vector = database_vectors[i];

			const score = cosine_similarity(single_vector, vector);

			let book = { ...database[i], score };

			recommend.push(book);
			console.log(`Scored ${i + 1}/${total}`);
		}

		console.log("created recommended");
		if (name !== "id") {
			const json = { list: [...recommend] };
			await fs.writeFile(
				`./json/${name}-recommended.json`,
				JSON.stringify(json)
			);
		}
	}
	return recommend;
};
const filter_recommended = (
	recommended_list,
	ignore_list,
	filterlist,
	blacklist,
	num_results,
	name
) => {
	// order rankings
	recommended_list.sort((a, b) => {
		return b.score - a.score;
	});
	// filter rankings
	// remove favorited post
	if (name == "database") {
		recommended_list = recommended_list.filter(
			(book) => !is_in_array(ignore_list, book.title)
		);
	}

	recommended_list = filterDatabase(recommended_list, filterlist, blacklist);
	// recommended_list = recommended_list.filter(
	// 	(book) => parseInt(book.num_favorites) >= 10000
	// );
	// return list of
	return recommended_list.slice(0, num_results);
};

router.get("/recommend", async (req, res) => {
	let id = parseInt(req.query.id);
	// search ? (search_list = [search]) : (search_list = []);

	// id ? (search = `${id}`) : (search = `${search}`);
	// search ? (search = `${search}`) : (search = `${id}`);
	// // filter databases

	let ref_tags = await gen_ref_tags(filtered_fav);

	// ref_tags = gen_ref_tags(filtered_database);

	let database_TF_IDF_Vectors = await get_Database_TF_IDF_Vectors(
		filtered_database,
		ref_tags
	);

	let search_vector;
	let search_vector_name;
	if (id) {
		search_vector_name = "id";
		for (let i = 0; i < filtered_database.length; i++) {
			const book = filtered_database[i];
			if (book.id == id) {
				search_vector = database_TF_IDF_Vectors[i];
				break;
			}
		}
	} else {
		search_vector_name = "user";

		let favorites_TF_IDF_Vectors = await get_Favorites_TF_IDF_Vectors(
			filtered_fav,
			ref_tags
		);

		search_vector = avg_vectors(favorites_TF_IDF_Vectors);
	}

	let recommended_list = await get_recommended(
		search_vector,
		database_TF_IDF_Vectors,
		filtered_database,
		search_vector_name
	);

	let ignore_list = [...filtered_fav];
	let search = req.query.tag;
	let search_list = [];
	search ? (search_list = [search]) : (search_list = []);
	const filterlist = {
		num_pages: -1,
		num_favorites: -1,
		tags: search_list
	};
	let filtered_recommended_list = filter_recommended(
		recommended_list,
		ignore_list,
		filterlist,
		blacklist,
		150,
		"database"
	);

	// filtered_recommended_list = filtered_recommended_list.filter((book) => {
	// 	console.log(book.score);
	// 	return parseInt(book.score) <= 0.8;
	// });

	await scrapeThumbnails(filtered_recommended_list);

	res.render("pages/recommended", {
		data: filtered_recommended_list,
		search: search
	});
});
module.exports = router;
