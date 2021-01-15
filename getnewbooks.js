const { scrapeNHentai } = require("./nhentai.js");
startid = 276001;
endid = 400000;
pagestart = Math.floor(startid / 1000);
scrapeNHentai(startid, endid, pagestart);
