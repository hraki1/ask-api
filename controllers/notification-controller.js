const Post = require("../model/post");

const Notification = require("../model/notification");

const HttpError = require("../model/http-error");

const getAllNotifications = async (req, res, next) => {
  let notifications;
  try {
    notifications = await Notification.find();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Somthing went wrong, could not find a notifications",
      500
    );
    return next(error);
  }

  if (!notifications) {
    return next(HttpError("Could not find a notifications", 404));
  }

  const notificationsObj = notifications.map((post) =>
    post.toObject({ getters: true })
  );

  return res.status(200).json(notificationsObj);
};

const getPostById = async (req, res, next) => {
  const postId = req.params.id;

  let post;
  try {
    post = await Post.findById(postId)
      .populate({
        path: "answers",
        populate: {
          path: "creator",
          select: "name email imageUrl",
        },
      })
      .populate("creator");
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Somthing went wrong, could not find a post",
      500
    );
    return next(error);
  }

  if (!post) {
    return next(new HttpError("Could not find a post for provided id.", 404));
  }

  const postOjb = post.toObject({ getters: true });

  return res.status(200).json(postOjb);
};

const getNotificationsByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let notifications;
  try {
    notifications = await Notification.find({ receiver: userId }).populate(
      "sender"
    );
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Something went wrong, please try again later", 500)
    );
  }

  if (!notifications || notifications.length === 0) {
    return res.status(200).json({ notifications: [] });
  }

  const formattedNotifications = notifications.map((notification) =>
    notification.toObject({ getters: true })
  );

  res.status(200).json({ notifications: formattedNotifications });
};

const DeleteNotification = async (req, res, next) => {
  const nId = req.params.id;

  let notifications;
  try {
    notifications = await Notification.findById(nId);
  } catch (err) {
    console.log(err);
    return next(
      new HttpError(
        "Updating notification fild, could not update notification.",
        500
      )
    );
  }

  if (!notifications) {
    return next(new HttpError("Could not find notification for this id.", 404));
  }

  if (notifications.receiver.toString() !== req.userData.userId) {
    return next(
      new HttpError(
        "You are not allowed to read or delete this notification.",
        401
      )
    );
  }

  try {
    await notifications.deleteOne();
  } catch (err) {
    return next(
      new HttpError("delete notification fild, please try again.", 500)
    );
  }

  return res.status(200).json({ message: "delete notificatin successfully" });
};

const readNotification = async (req, res, next) => {
  const nId = req.params.id;

  let notification;
  try {
    notification = await Notification.findById(nId);
  } catch (err) {
    console.log(err);
    return next(
      new HttpError(
        "Updating notification fild, could not update notification.",
        500
      )
    );
  }

  if (!notification) {
    return next(new HttpError("Could not find notification for this id.", 404));
  }

  if (notification.receiver.toString() !== req.userData.userId) {
    return next(
      new HttpError(
        "You are not allowed to read or delete this notification.",
        401
      )
    );
  }

  notification.isRead = true;

  try {
    await notification.save();
  } catch (err) {
    return next(
      new HttpError("read notification fild, please try again.", 500)
    );
  }

  return res.status(200).json(notification.toObject({ getters: true }));
};

module.exports = {
  getAllNotifications,
  getPostById,
  getNotificationsByUserId,
  DeleteNotification,
  readNotification,
};
