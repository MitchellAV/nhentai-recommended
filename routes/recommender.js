const express = require("express");
const router = express.Router();
const math = require("mathjs");

const { cleanDatabase } = require("../filter");
const { get_database, gen_ref_tags } = require("../util");
const { scrapeThumbnails } = require("../nhentai.js");
const {
	filter_recommended,
	get_recommended,
	get_TF_IDF_Vectors
} = require("../recommendation_engine.js");

let favorites = require("../json/personal/favorites.json").favorites;
let blacklist = require("../json/personal/blacklist.json").list;
let common_tags = [
	"japanese",
	"english",
	"chinese",
	"manga",
	"translated",
	"doujinshi"
	// "big breasts",
	// "sole female",
	// "group",
	// "lolicon",
	// "sole male",
	// "anal",
	// "stockings",
	// "schoolgirl uniform",
	// "glasses",
	// "nakadashi",
	// "blowjob"
];
const database = [...get_database(0, Infinity)];

let filtered_fav = cleanDatabase(favorites);
console.log("created filtered fav");
const filtered_database = cleanDatabase(database);
console.log("created filtered database");

router.get("/personal", async (req, res) => {
	// Array of Strings
	let ref_tags = await gen_ref_tags(filtered_fav);
	ref_tags = ref_tags.filter((tag) => !common_tags.includes(tag));

	// Sparse 2D Array of Vectors with TFIDF scores from tags
	let favorites_TF_IDF_Vectors = await get_TF_IDF_Vectors(
		filtered_fav,
		ref_tags,
		"favorites_TFIDF",
		"favorites"
	);
	// If rating multiply each vector by rating here

	// Average all vectors to create average user preferences from tags
	let search_vector = math.apply(favorites_TF_IDF_Vectors, 0, math.sum);
	// let search_vector = avg_vectors(favorites_TF_IDF_Vectors);

	let search_vector_name = "favorites";
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

	// recommended_list = recommended_list.filter((item) => {return });

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

router.get("/", async (req, res) => {
	let id = parseInt(req.query.id);

	let ref_tags = await gen_ref_tags(filtered_fav);

	ref_tags = ref_tags.filter((tag) => !common_tags.includes(tag));
	// ref_tags = gen_ref_tags(filtered_database);

	let database_TF_IDF_Vectors = await get_TF_IDF_Vectors(
		filtered_database,
		ref_tags,
		"database_TFIDF",
		"database"
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

		let favorites_TF_IDF_Vectors = await get_TF_IDF_Vectors(
			filtered_fav,
			ref_tags,
			"favorites_TFIDF",
			"favorites"
		);

		search_vector = math.multiply(
			math.apply(favorites_TF_IDF_Vectors, 0, math.sum),
			1 / favorites_TF_IDF_Vectors.length
		);
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
		num_pages: 101,
		num_favorites: -1,
		tags: search_list
	};

	let only_known_artists = req.query.only_known_artists;

	if (only_known_artists) {
		const fav_artists = [];
		for (let i = 0; i < favorites.length; i++) {
			const tags = favorites[i].tags;
			for (let j = 0; j < tags.length; j++) {
				const type = tags[j].type;
				const tag = tags[j].name;
				if (type == "artist") {
					if (!fav_artists.includes(tag)) {
						fav_artists.push(tag);
					}
				}
			}
		}

		const filter_artist_recommended = [];
		for (let i = 0; i < recommended_list.length; i++) {
			const book = recommended_list[i];
			const artists = book.artists;
			for (let j = 0; j < artists.length; j++) {
				const artist = artists[j];
				if (fav_artists.includes(artist)) {
					filter_artist_recommended.push(book);
					break;
				}
			}
		}
		recommended_list = filter_artist_recommended;
	}
	let filtered_recommended_list = filter_recommended(
		recommended_list,
		ignore_list,
		filterlist,
		blacklist,
		100,
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
