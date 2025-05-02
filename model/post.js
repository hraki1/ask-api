const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const postModel = new Schema(
  {
    title: { type: String, required: true },
    question: { type: String, required: true },
    imageUrl: { type: String },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    creator: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    answers: [{ type: Schema.Types.ObjectId, required: true, ref: "Answer" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postModel);
