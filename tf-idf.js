const fs = require("fs").promises;

const TF = (book_tags, ref_tags) => {
	let TF_Vector = Array(ref_tags.length);
	TF_Vector.fill(0);

	const total_num_tags_in_doc = book_tags.length;
	for (let i = 0; i < total_num_tags_in_doc; i++) {
		const tag = book_tags[i];

		const freq_tag_in_doc = 1; // every book has unique tags
		const index = ref_tags.indexOf(tag);
		if (index !== -1) {
			TF_Vector[index] = freq_tag_in_doc / total_num_tags_in_doc;
		}
	}
	return TF_Vector;
};

const count_docs_with_tag = (tag, all_books) => {
	let count = 0;
	for (let i = 0; i < all_books.length; i++) {
		const book = all_books[i];

		const book_tags = book.tags;
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
const gen_count_books_tag = (all_books, ref_tags) => {
	let count_books_tag = [];
	const ref_tags_length = ref_tags.length;
	for (let i = 0; i < ref_tags_length; i++) {
		const tag = ref_tags[i];
		const count = count_docs_with_tag(tag, all_books);
		count_books_tag.push(count);
		console.log(`ref: ${i + 1}/${ref_tags_length}`);
	}
	return count_books_tag;
};

const IDF = (all_books, book_tags, ref_tags, count_books_tag) => {
	let IDF_Vector = Array(ref_tags.length);
	IDF_Vector.fill(0);

	const total_num_docs = all_books.length;
	const book_tags_length = book_tags.length;
	for (let i = 0; i < book_tags_length; i++) {
		const tag = book_tags[i];
		// console.time("for loop");
		let index = findItemIndex(ref_tags, tag);
		// console.timeEnd("for loop");
		// console.time("indexof");
		// index = ref_tags.indexOf(tag);
		// console.timeEnd("indexof");
		if (index !== -1) {
			let num_docs_with_tag = count_books_tag[i];

			IDF_Vector[index] = Math.log(total_num_docs / num_docs_with_tag);
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

const TF_IDF = async (all_books, ref_tags) => {
	let count_books_tag;
	try {
		count_books_tag = require("../json/count_books_tag.json").list;
		if (count_books_tag.length !== ref_tags.length) {
			throw new Error("Length different");
		}
	} catch (err) {
		count_books_tag = gen_count_books_tag(all_books, ref_tags);
		console.log("created TF-IDF database vectors");
		const json = { list: [...count_books_tag] };
		await fs.writeFile("./json/count_books_tag.json", JSON.stringify(json));
	}
	const all_TF_IDF_Vectors = [];
	const total = all_books.length;

	console.time("finish");
	let all_books_length = all_books.length;
	for (let i = 0; i < all_books_length; i++) {
		const book = all_books[i];

		const book_tags = book.tags;
		// console.time("TF");
		const TF_Vector = TF(book_tags, ref_tags);
		// console.timeEnd("TF");
		// console.time("IDF");
		const IDF_Vector = IDF(all_books, book_tags, ref_tags, count_books_tag);
		// console.timeEnd("IDF");

		// console.time("TF-IDF");
		let TF_IDF_Vector = multiply_TF_IDF(TF_Vector, IDF_Vector);
		// console.timeEnd("TF-IDF");
		// console.time("map");
		// TF_IDF_Vector = TF_Vector.map((e, i) => e * IDF_Vector[i]);
		// console.timeEnd("map");
		all_TF_IDF_Vectors.push(TF_IDF_Vector);
		console.log(`Created ${i + 1}/${total}`);
	}
	console.timeEnd("finish");

	return all_TF_IDF_Vectors;
};

module.exports = { TF_IDF };