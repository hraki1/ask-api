const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minLength: 5 },
    imageUrl: { type: String },
    bio: { type: String },
    posts: [{ type: Schema.Types.ObjectId, required: true, ref: "Post" }],
    answers: [{ type: Schema.Types.ObjectId, required: true, ref: "Answer" }],
    savedPosts: [{ type: Schema.Types.ObjectId, required: true, ref: "Post" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
