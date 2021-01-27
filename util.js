const fsSync = require("fs");
const fs = require("fs").promises;

const sleep = (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};
const combination = (array) => {
	let results = [];
	// Since you only want pairs, there's no reason
	// to iterate over the last element directly
	for (let i = 0; i < array.length - 1; i++) {
		// This is where you'll capture that last value
		for (let j = i + 1; j < array.length; j++) {
			results.push(`${array[i]} ${array[j]}`);
		}
	}
	return results;
};
const get_database = (start, stop) => {
	const files = fsSync.readdirSync("./json/database/");
	let database = [];
	stop = stop > files.length ? files.length : stop;

	for (let i = start; i < stop; i++) {
		const file = files[i];
		console.log(i, file);
		let datapart = require(`./json/database/${file}`).posts;
		database = [...database, ...datapart];
	}

	return database;
};
const gen_ref_tags = async (database) => {
	let ref_tags;
	let num_fav;
	try {
		ref_tags = require("./json/ref_tags.json");
		num_fav = ref_tags.num_fav;
		ref_tags = ref_tags.list;

		if (num_fav !== database.length) {
			throw new Error("Length different");
		}
	} catch (err) {
		ref_tags = [];
		for (let i = 0; i < database.length; i++) {
			const book_tags = database[i].tags;
			for (let j = 0; j < book_tags.length; j++) {
				const tag = book_tags[j];
				if (!ref_tags.includes(tag)) {
					ref_tags.push(tag);
				}
			}
		}
		// ref_tags.sort();
		ref_tags = [...new Set(ref_tags)];
		num_fav = database.length;
		console.log("created ref tags");
		const json = { list: [...ref_tags], num_fav };
		await fs.writeFile("./json/ref_tags.json", JSON.stringify(json));
	}
	return ref_tags;
};
module.exports = { sleep, combination, gen_ref_tags, get_database };
