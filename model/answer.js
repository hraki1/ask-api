const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const answerModel = new Schema(
  {
    answer: { type: String, required: true },
    author: { type: String, required: true },
    creator: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    postId: { type: Schema.Types.ObjectId, required: true, ref: "Post" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Answer", answerModel);
