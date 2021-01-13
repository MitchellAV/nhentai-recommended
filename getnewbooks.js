const { scrapeNHentai } = require("./nhentai.js");
startid = 202001;
endid = 250000;
pagestart = Math.floor(startid / 1000);
scrapeNHentai(startid, endid, pagestart);
