const { get_database } = require("./util");
const { cleanDatabase } = require("./filter");

const database = [...get_database(0, Infinity)];

const { scrapeNHentai, scrapeThumbnails } = require("./nhentai.js");
// let startid = 107001;
// let endid = 200000;
// let pagestart = Math.floor(startid / 1000);
// scrapeNHentai(startid, endid, pagestart).then(() => {
// 	startid = 323001;
// 	endid = 400000;
// 	pagestart = Math.floor(startid / 1000);
// 	scrapeNHentai(startid, endid, pagestart);
// });

const filtered_database = cleanDatabase(database);

scrapeThumbnails(filtered_database);
