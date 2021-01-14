const axios = require("axios");
const fs = require("fs");

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
	const consecLimit = 20;
	let isFinished = false;
	while (!isFinished) {
		console.log(`Page: ${page}`);
		let json = { posts: [] };
		let startId = id;
		let numErrors = 0;
		let consec_errors = 0;
		while (id < startId + itemsPerPage && id <= end_id && !isFinished) {
			try {
				book = await axios.get(`https://nhentai.net/api/gallery/${id}`);
				consec_errors = 0;
				json.posts.push(book.data);
				console.log(`id: ${id}`);
			} catch (err) {
				numErrors++;
				consec_errors++;
				if (consec_errors > consecLimit) {
					isFinished = true;
				}
				console.log(err);
			}
			id++;
		}

		fs.writeFileSync(
			`./json/database/${page}-${itemsPerPage}-nhentai.json`,
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

module.exports = { getBook, scrapeNHentai };
