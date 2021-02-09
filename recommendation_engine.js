const math = require("mathjs");
const fs = require("fs").promises;
const { filterDatabase } = require("./filter");
const { TF_IDF } = require("./tf-idf");

const avg_vectors = (vectors) => {
	let sum_vectors = Array(vectors.size()[0]).fill(0);
	vectors = vectors.toArray();
	vectors.forEach((vector) => {
		sum_vectors = sum_vectors.map((e, i) => e + vector[i]);
	});

	// vectors.map((value, index, matrix) => {return });

	let max = math.norm(sum_vectors);
	let avg_vector = sum_vectors.map((x) => x / max);
	return avg_vector;
};
const cosine_similarity = (vectorA, vectorB) => {
	vectorA = math.matrix(vectorA, "sparse");
	vectorB = math.matrix(vectorB, "sparse");
	const a_norm = math.hypot(vectorA);
	const b_norm = math.hypot(vectorB);
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

const get_TF_IDF_Vectors = async (
	filtered_database,
	ref_tags,
	filename,
	vector_name
) => {
	let database_vectors;
	try {
		database_vectors = require(`./json/${filename}.json`);
		database_vectors = database_vectors.list;
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
			vector_name
		);
		console.log(`created ${vector_name} TF-IDF database vectors`);
		const json = { list: [...database_vectors] };
		await fs.writeFile(`./json/${filename}.json`, JSON.stringify(json));
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
		recommend = require(`./json/${name}-recommended.json`).list;
		if (recommend.length !== database_vectors.length) {
			throw new Error("Length different");
		}
	} catch (err) {
		recommend = [];
		// single_vector = math.matrix(single_vector, "sparse");
		const database_size = database_vectors.length;
		for (let i = 0; i < database_size; i++) {
			// console.time("vector");
			// const vector = math.row(database_vectors, i);
			// const vector = math.transpose(
			// 	math.matrix(database_vectors[i], "sparse")
			// );
			const vector = database_vectors[i];
			// console.timeEnd("vector");

			// console.time("score");
			const score = cosine_similarity(single_vector, vector);
			// console.timeEnd("score");

			// console.time("book");
			let book = { ...database[i], score };
			// console.timeEnd("book");

			// console.time("recommend");
			recommend.push(book);
			// console.timeEnd("recommend");
			if (i % 10000 == 0) {
				console.log(`Scored ${i + 1}/${database_size}`);
			}
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

module.exports = {
	filter_recommended,
	get_recommended,
	get_TF_IDF_Vectors,

	avg_vectors
};
