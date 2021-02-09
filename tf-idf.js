const fs = require("fs").promises;
const math = require("mathjs");

const TF = (book_tags, ref_tags) => {
	let TF_Vector = Array(ref_tags.length).fill(0);

	const total_num_tags_in_doc = book_tags.length;
	for (let i = 0; i < total_num_tags_in_doc; i++) {
		const tag = book_tags[i];

		const freq_tag_in_doc = 1; // every book has unique tags
		const index = ref_tags.indexOf(tag);
		if (index !== -1) {
			TF_Vector[index] = freq_tag_in_doc / total_num_tags_in_doc;
			// TF_Vector[index] = 1;
		}
	}
	return TF_Vector;
};

const count_docs_with_tag = (tag, all_books) => {
	let count = 0;
	for (let i = 0; i < all_books.length; i++) {
		const book_tags = all_books[i].tags;
		const book_tags_length = book_tags.length;
		for (let j = 0; j < book_tags_length; j++) {
			if (tag === book_tags[j]) {
				count++;
				break;
			}
		}
	}
	return count;
};

const findItemIndex = (array, item) => {
	var arrayLen = array.length;
	for (var i = 0; i < arrayLen; i++) {
		if (array[i] === item) {
			return i;
		}
	}
	return -1;
};
const gen_tag_count = (all_books, ref_tags) => {
	let count_books_tag = [];
	const ref_tags_length = ref_tags.length;
	for (let i = 0; i < ref_tags_length; i++) {
		const tag = ref_tags[i];
		const count = count_docs_with_tag(tag, all_books);
		count_books_tag.push(count);
	}
	return count_books_tag;
};

const IDF = (all_books, book_tags, ref_tags, count_books_tag) => {
	let IDF_Vector = Array(ref_tags.length).fill(0);

	const total_num_docs = all_books.length;
	const book_tags_length = book_tags.length;
	for (let i = 0; i < book_tags_length; i++) {
		const tag = book_tags[i];
		let index = findItemIndex(ref_tags, tag);
		if (index !== -1) {
			let num_docs_with_tag = count_books_tag[index];
			IDF_Vector[index] =
				1 + Math.log(total_num_docs / (1 + num_docs_with_tag));
		}
	}
	return IDF_Vector;
};

const multiply_TF_IDF = (TF_Vector, IDF_Vector) => {
	let TF_IDF_Vector = [];
	let length = TF_Vector.length;
	for (i = 0; i < length; i++) {
		TF_IDF_Vector.push(TF_Vector[i] * IDF_Vector[i]);
	}
	return TF_IDF_Vector;
};

const get_tag_count = async (all_books, ref_tags, name) => {
	let count_books_tag;
	try {
		count_books_tag = require(`../json/${name}_tag_count.json`).list;
		if (count_books_tag.length !== ref_tags.length) {
			throw new Error("Length different");
		}
	} catch (err) {
		count_books_tag = gen_tag_count(all_books, ref_tags);
		console.log("created TF-IDF database vectors");
		const json = { list: [...count_books_tag] };
		await fs.writeFile(
			`./json/${name}_tag_count.json`,
			JSON.stringify(json)
		);
	}
	return count_books_tag;
};

const TF_IDF = async (all_books, ref_tags, name) => {
	const count_books_tag = await get_tag_count(all_books, ref_tags, name);

	const all_TF_IDF_Vectors = [];

	let all_books_length = all_books.length;
	for (let i = 0; i < all_books_length; i++) {
		const book_tags = all_books[i].tags;
		const TF_Vector = TF(book_tags, ref_tags);
		const IDF_Vector = IDF(all_books, book_tags, ref_tags, count_books_tag);
		const TF_IDF_Vector = multiply_TF_IDF(TF_Vector, IDF_Vector);
		all_TF_IDF_Vectors.push(TF_IDF_Vector);
		// console.log(`Created ${i + 1}/${all_books_length}`);
	}

	return all_TF_IDF_Vectors;
};

module.exports = { TF_IDF };
