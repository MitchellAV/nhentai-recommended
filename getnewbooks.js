const { scrapeNHentai } = require("./nhentai.js");
<<<<<<< HEAD
startid = 207001;
endid = 300000;
=======
startid = 202001;
endid = 250000;
>>>>>>> ce62918ac11aa91d4c30c607996e8f381699a75f
pagestart = Math.floor(startid / 1000);
scrapeNHentai(startid, endid, pagestart);
