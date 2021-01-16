const { get_database } = require("./util");
const { cleanDatabase } = require("./filter");

const database = [...get_database(0, Infinity)];

const { scrapeNHentai, scrapeThumbnails } = require("./nhentai.js");
let startid = 25001;
let endid = 400000;
let pagestart = Math.floor(startid / 1000);
scrapeNHentai(startid, endid, pagestart, database);

// const filtered_database = cleanDatabase(database);

// scrapeThumbnails(filtered_database);
