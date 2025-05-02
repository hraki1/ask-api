const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const notificationModal = new Schema(
  {
    type: { type: String, required: true },
    isRead: { type: Boolean, required: true },
    sender: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    receiver: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    postId: {
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationModal);
