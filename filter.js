const { combination } = require("./util");
const assign_popularity = (num_favorites) => {
	let tag = "";
	if (num_favorites <= 2000) {
		tag = "popularity-0";
	} else if (num_favorites <= 5000) {
		tag = "popularity-1";
	} else if (num_favorites <= 10000) {
		tag = "popularity-2";
	} else if (num_favorites <= 25000) {
		tag = "popularity-3";
	} else if (num_favorites <= 50000) {
		tag = "popularity-4";
	} else {
		tag = "popularity-5";
	}
	return tag;
};
const assign_length = (num_pages) => {
	let tag = "";
	if (num_pages <= 10) {
		tag = "length-very-short";
	} else if (num_pages <= 25) {
		tag = "length-short";
	} else if (num_pages <= 100) {
		tag = "length-medium";
	} else {
		tag = "length-long";
	}
	return tag;
};

const get_img_type = (img_char) => {
	let tag = "";
	if (img_char == "j") {
		tag = ".jpg";
	} else if (img_char == "p") {
		tag = ".png";
	}
	return tag;
};

const filterDatabase = (input_array, searchlist, blacklist = []) => {
	const output_array = [];
	input_array.forEach((book, i) => {
		let skip = false;
		let newfilter = { ...searchlist };

		const { id, title, num_favorites, num_pages, upload_date, tags } = book;
		if (id == 305243) {
			let stop = false;
		}
		if (!skip) {
			let num_pages_tag = assign_length(num_pages);
			if (newfilter.num_pages != -1) {
				let filter = assign_length(newfilter.num_pages);
				if (num_pages_tag === filter) {
					skip = true;
				}
			}
		}
		if (!skip) {
			let num_favorites_tag = assign_popularity(num_favorites);
			if (newfilter.num_favorites != -1) {
				let filter = assign_popularity(newfilter.num_pages);
				if (num_favorites_tag === filter) {
					skip = true;
				}
			}
		}
		if (!skip) {
			for (let j = 0; j < tags.length; j++) {
				const tag = tags[j];
				if (blacklist.includes(tag)) {
					skip = true;
					break;
				}
			}
		}
		if (!skip) {
			for (let j = 0; j < tags.length; j++) {
				const tag = tags[j];

				if (!newfilter.tags.includes(tag)) {
					skip = true;
				} else {
					skip = false;
					break;
				}
			}
		}
		// if (newfilter.tags.length !== 0) {
		// 	skip = true;
		// }

		if (!skip) {
			output_array.push(input_array[i]);
		}
	});
	return output_array;
};

const cleanDatabase = (input_array) => {
	const output_array = [];
	input_array.forEach((book) => {
		const {
			id,
			media_id,
			title,
			num_favorites,
			num_pages,
			upload_date,
			tags,
			images: { thumbnail }
		} = book;
		const filteredBook = {
			id,
			media_id,
			title: title.pretty,
			num_favorites,
			num_pages,
			upload_date: new Date(upload_date * 1000).toUTCString(),
			url: `https://nhentai.net/g/${id}`,
			thumbnail_url: `https://t.nhentai.net/galleries/${media_id}/thumb${get_img_type(
				thumbnail.t
			)}`,
			tags: [],
			score: 0
		};
		let num_pages_tag = assign_length(num_pages);
		filteredBook.tags.push(num_pages_tag);
		let num_favorites_tag = assign_popularity(num_favorites);
		filteredBook.tags.push(num_favorites_tag);

		for (let i = 0; i < tags.length; i++) {
			const { name } = tags[i];

			filteredBook.tags.push(name);
		}

		filteredBook.tags = [
			...filteredBook.tags
			// ...combination(filteredBook.tags)
		];

		output_array.push(filteredBook);
	});

	return output_array;
};
module.exports = { filterDatabase, cleanDatabase };
