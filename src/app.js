const express = require("express");
require('express-async-errors');
const cors = require("cors");
const app = express();
const path = require("path");
const authRouter = require("./routes/auth"); 
const questionsRouter = require("./routes/questions"); 
const errorHandler = require("./middleware/errorHandler");
const { NotFoundError } = require("./lib/errors");
const pinoHttp = require("pino-http");
const logger = require("./lib/logger");


app.use(pinoHttp({logger,
 autoLogging: { ignore: (req) => req.url.startsWith("/uploads") },
}));


app.use(express.static(path.join(__dirname, "..", "public")));

app.use(cors());
// Middleware to parse JSON bodies
app.use(express.json());



// everything under /api/questions
app.use("/api/questions", questionsRouter);
app.use("/api/auth", authRouter);

app.use((req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);
module.exports = app