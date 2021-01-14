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
	if (num_pages <= 25) {
		tag = "length-short";
	} else if (num_pages <= 100) {
		tag = "length-medium";
	} else {
		tag = "length-long";
	}
	return tag;
};

const convertVector = (
	input_array,
	blacklist = [],
	filterlist = { num_pages: -1, num_favorites: -1, tags: [] }
) => {
	const output_array = [];
	input_array.forEach((book) => {
		let skip = false;
		const { id, tags, num_pages, num_favorites, title } = book;
		const filteredBook = {
			id,
			title: title.pretty,
			num_pages,
			num_favorites,
			tags: []
		};
		if (!skip) {
			let num_pages_tag = assign_length(num_pages);
			if (filterlist.num_pages != -1) {
				let filter = assign_length(filterlist.num_pages);
				if (num_pages_tag === filter) {
					skip = true;
				}
			}
			filteredBook.tags.push(num_pages_tag);
		}
		if (!skip) {
			let num_favorites_tag = assign_popularity(num_favorites);
			if (filterlist.num_favorites != -1) {
				let filter = assign_popularity(filterlist.num_pages);
				if (num_favorites_tag === filter) {
					skip = true;
				}
			}
			filteredBook.tags.push(num_favorites_tag);
		}
		if (!skip) {
			for (let i = 0; i < tags.length; i++) {
				const tag = tags[i];

				if (blacklist.includes(tag.name)) {
					skip = true;
					break;
				}
				let tag_index = filterlist.tags.indexOf(tag.name);
				if (tag_index !== -1) {
					filterlist.tags.splice(tag_index, 1);
				}
				filteredBook.tags.push(tag.name);
			}
			if (filterlist.tags.length !== 0) {
				skip = true;
			}
		}
		filteredBook.tags = combination(filteredBook.tags);
		// filteredBook.tags.forEach((tag) => {
		// 	const index = ref_tags.indexOf(tag);
		// 	if (index !== -1) {
		// 		filteredBook.vector[index] = 1;
		// 	}
		// });
		if (!skip) {
			output_array.push(filteredBook);
		}
	});
	return output_array;
};
module.exports = { convertVector };
