const axios = require("axios");
const fs = require("fs");
const { add, dot, norm } = require("mathjs");

/**
 * nhentai.net API GET Requests
 *
 
 *
 * 5 Related Books
 * @request GET
 * @param id 1 - latest
 * https://nhentai.net/api/gallery/:id/related
 *
 * 5 Related Books
 * @request GET
 * @param id 1 - latest
 * https://nhentai.net/api/gallery/:id/related
 *
 * Search for books based on query
 * Follows nhentai.net info https://nhentai.net/info/
 * @request GET
 * @param search_term
 * @param page_num
 * https://nhentai.net/api/galleries/search?query=:search_term&page=:page_num
 */

/**
 * Single Book
 * GET
 * id 1 - latest
 * https://nhentai.net/api/gallery/:id
 */
const getBook = async (id) => {
	try {
		const response = await axios.get(
			`https://nhentai.net/api/gallery/${id}`
		);
		const book = response.data;
		return book;
	} catch (err) {
		console.error(err);
		return;
	}
};

const scrapeNHentai = async (start_id, end_id, page) => {
	let id = start_id;
	const itemsPerPage = 1000;
	let isFinished = false;
	while (!isFinished) {
		console.log(`Page: ${page}`);
		let json = { posts: [] };
		let startId = id;
		let numErrors = 0;
		while (id < startId + itemsPerPage && id <= end_id) {
			try {
				book = await axios.get(`https://nhentai.net/api/gallery/${id}`);
				json.posts.push(book.data);
				console.log(`id: ${id}`);
			} catch (err) {
				numErrors++;
				console.log(err);
			}
			id++;
		}

		fs.writeFileSync(
			`./json/${page}-${itemsPerPage}-nhentai.json`,
			JSON.stringify(json)
		);

		if (numErrors == itemsPerPage || id > end_id) {
			isFinished = true;
		} else {
			page++;
		}
	}
	console.log(`Finished!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
};

const convertVector = (input_array, ref_tags) => {
	const output_array = [];
	input_array.forEach((book) => {
		let vector = Array(ref_tags.length);
		vector.fill(0);
		const { id, tags, num_pages, num_favorites } = book;
		const filteredBook = { id, num_pages, num_favorites, tags: [] };
		tags.forEach((tag) => {
			// switch (tag.type) {
			// 	case "tag":
			// 		filteredBook.tags.push(tag.name);
			// 		break;
			// 	case "parody":
			// 		filteredBook.tags.push(tag.name);
			// 		break;
			// 	case "character":
			// 		filteredBook.tags.push(tag.name);
			// 		break;
			// 	case "artist":
			// 		filteredBook.tags.push(tag.name);
			// 		break;
			// }
			filteredBook.tags.push(tag.name);
		});
		// filteredBook.tags.forEach((tag) => {
		// 	const index = ref_tags.indexOf(tag);
		// 	if (index !== -1) {
		// 		filteredBook.vector[index] = 1;
		// 	}
		// });
		output_array.push(filteredBook);
	});
	return output_array;
};

const sleep = (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};
/**
 *
 * @param {*} book_tags
 * @param {*} ref_tags
 */
const TF = (book_tags, ref_tags) => {
	let TF_Vector = [];
	const total_num_tags_in_doc = book_tags.length;
	book_tags.forEach((tag) => {
		const freq_tag_in_doc = 1; // every book has unique tags
		const index = ref_tags.indexOf(tag);

		TF_Vector[index] = freq_tag_in_doc / total_num_tags_in_doc;
	});
	return TF_Vector;
};

const count_docs_with_tag = (tag, all_books) => {
	let count = 0;
	all_books.forEach((book) => {
		const book_tags = book.tags;
		for (let i = 0; i < book_tags.length; i++) {
			if (tag === book_tags[i].name) {
				count++;
				break;
			}
		}
	});
	return count;
};

const IDF = (all_books, book_tags, ref_tags) => {
	let IDF_Vector = [];
	const total_num_docs = all_books.length;
	book_tags.forEach((tag) => {
		let num_docs_with_tag = count_docs_with_tag(tag, all_books);

		const index = ref_tags.indexOf(tag);

		IDF_Vector[index] = Math.log(total_num_docs / num_docs_with_tag);
	});
	return IDF_Vector;
};

const TF_IDF = (all_books, ref_tags) => {
	const all_TF_IDF_Vectors = [];
	all_books.forEach((book) => {
		const book_tags = book.tags;
		const TF_Vector = TF(book_tags, ref_tags);
		const IDF_Vector = IDF(all_books, book_tags, ref_tags);
		all_TF_IDF_Vectors.push(TF_Vector.map((e, i) => e * IDF_Vector[i]));
	});
	return all_TF_IDF_Vectors;
};

module.exports = { getBook, convertVector, sleep, scrapeNHentai, TF_IDF };
