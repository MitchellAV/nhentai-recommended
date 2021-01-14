const { scrapeNHentai } = require("./nhentai.js");
startid = 207001;
endid = 300000;
pagestart = Math.floor(startid / 1000);
scrapeNHentai(startid, endid, pagestart);
