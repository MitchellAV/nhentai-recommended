const express = require("express");
const app = express();

app.use("/", require("./routes/nhentai_update"));
app.use("/", require("./routes/recommender"));

app.listen(3000, console.log("Yep"));
