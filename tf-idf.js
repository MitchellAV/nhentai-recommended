const TF = (book_tags, ref_tags) => {
	let TF_Vector = Array(ref_tags.length);
	TF_Vector.fill(0);

	const total_num_tags_in_doc = book_tags.length;
	book_tags.forEach((tag) => {
		const freq_tag_in_doc = 1; // every book has unique tags
		const index = ref_tags.indexOf(tag);
		if (index !== -1) {
			TF_Vector[index] = freq_tag_in_doc / total_num_tags_in_doc;
		}
	});
	return TF_Vector;
};

const count_docs_with_tag = (tag, all_books) => {
	let count = 0;
	all_books.forEach((book) => {
		const book_tags = book.tags;
		for (let i = 0; i < book_tags.length; i++) {
			if (tag === book_tags[i]) {
				count++;
				break;
			}
		}
	});
	return count;
};

const IDF = (all_books, book_tags, ref_tags) => {
	let IDF_Vector = Array(ref_tags.length);
	IDF_Vector.fill(0);

	const total_num_docs = all_books.length;
	book_tags.forEach((tag) => {
		const index = ref_tags.indexOf(tag);
		if (index !== -1) {
			let num_docs_with_tag = count_docs_with_tag(tag, all_books);

			IDF_Vector[index] = Math.log(total_num_docs / num_docs_with_tag);
		}
	});
	return IDF_Vector;
};

const TF_IDF = (all_books, ref_tags) => {
	const all_TF_IDF_Vectors = [];
	const total = all_books.length;
	all_books.forEach((book, i) => {
		const book_tags = book.tags;
		const TF_Vector = TF(book_tags, ref_tags);
		const IDF_Vector = IDF(all_books, book_tags, ref_tags);
		const TF_IDF_Vector = TF_Vector.map((e, i) => e * IDF_Vector[i]);
		all_TF_IDF_Vectors.push(TF_IDF_Vector);
		console.log(`Created ${i + 1}/${total}`);
	});
	return all_TF_IDF_Vectors;
};

module.exports = { TF_IDF };
