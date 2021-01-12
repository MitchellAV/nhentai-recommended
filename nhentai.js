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
const getBook = async((id) => {
	const response = await axios.get(`https://nhentai.net/api/gallery/${id}`);
	const book = response.data;
	return book;
});

const app = express();
const scrapeNHentai = async () => {
	let id = 1;
	let page = 1;
	const itemsPerPage = 1000;
	let isFinished = false;
	while (!isFinished) {
		console.log(`Page: ${page}`);
		let json = { posts: [] };
		let startId = id;
		let numErrors = 0;
		while (id < startId + itemsPerPage) {
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
		if (numErrors == itemsPerPage) {
			isFinished = true;
		} else {
			fs.writeFileSync(
				`./json/${page}-${itemsPerPage}-nhentai.json`,
				JSON.stringify(json)
			);
			page++;
		}
	}
	console.log(`Finished!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
};

module.exports = {getBook}
