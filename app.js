const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");

const HttpError = require("./model/http-error");
const postsRoutes = require("./routes/posts");
const usersRouter = require("./routes/users");
const answersRouter = require("./routes/answers");
const profileRouter = require("./routes/profile");
const notificationRouter = require("./routes/notifications");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.use(
  "/uploads/images",
  express.static(path.join(__dirname, "uploads/images"))
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

app.use("/api/posts", postsRoutes);
app.use("/api/users", usersRouter);
app.use("/api/answers", answersRouter);
app.use("/api/profile", profileRouter);
app.use("/api/notifications", notificationRouter);

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occurred!" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster-ask.dsflwde.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster-ask`
  )
  .then(() => {
    console.log("server connected!");
    app.listen(process.env.PORT || 9090);
  })
  .catch((err) => {
    console.log(err);
  });
