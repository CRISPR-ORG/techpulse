const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const apiRoutes = require("./src/routes");
require("./src/jobs/scheduler");

app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.json({ message: "News Aggregator API is running" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
