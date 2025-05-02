const { validationResult } = require("express-validator");
const fs = require("fs");

const Post = require("../model/post");
const User = require("../model/user");
const Answer = require("../model/answer");
const Notification = require("../model/notification");

const HttpError = require("../model/http-error");
const { default: mongoose } = require("mongoose");

const getAllPosts = async (req, res, next) => {
  let posts;
  try {
    posts = await Post.find().populate("creator").sort({ createdAt: -1 }); //.sort({ createdAt: -1 }); //use exec() to retun real promies
  } catch (err) {
    console.log(err);
    const error = HttpError("Somthing went wrong, could not find a posts", 500);
    return next(error);
  }

  if (!posts) {
    return next(HttpError("Could not find a posts", 404));
  }

  const postsOjb = posts.map((post) => post.toObject({ getters: true }));

  return res.status(200).json(postsOjb);
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

const getPostsByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let userWithPosts;
  try {
    userWithPosts = await User.findById(userId).populate({
      path: "posts",
      populate: {
        path: "creator",
        select: "name email imageUrl",
      },
    }); //use exec() to retun real promies
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Somthing went wrong, please try agin later", 500)
    );
  }

  if (!userWithPosts || userWithPosts.posts.length === 0) {
    return next(
      new HttpError("Could not find a post for provided user id.", 404)
    );
  }

  res.status(200).json({
    posts: userWithPosts.posts.map((post) => post.toObject({ getters: true })),
  });
};

const createPost = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);

    if (req?.file) {
      fs.unlink(req.file.path, (err) => {
        console.log(err);
      });
    }

    const error = new HttpError(
      "Invaild inputs passed, plase check your data.",
      422
    );
    return next(error);
  }
  console.log("before");

  const { title, question, creator } = req.body;

  let createdPost;

  if (req.file?.path) {
    createdPost = new Post({
      title,
      question,
      imageUrl: req.file.path,
      creator,
      likes: [],
      answers: [],
    });
  } else {
    createdPost = new Post({
      title,
      question,
      imageUrl: "",
      creator,
      likes: [],
      answers: [],
    });
  }

  console.log("after");

  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError("Creating post fild, please try again.", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id.", 404);
    return next(error);
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await createdPost.save({ session: session });
    user.posts.push(createdPost._id);
    await user.save({ session: session });
    await session.commitTransaction();
    await session.endSession();
  } catch (err) {
    const error = new HttpError("Creating post fild, please try again.", 500);
    return next(error);
  }

  let post;
  try {
    post = await Post.findById(createdPost._id).populate("creator");
  } catch (err) {
    console.log(err);
    return next(new HttpError("Creating post fild, please try again.", 500));
  }

  return res.status(201).json({ post: post.toObject({ getters: true }) });
};

const updatePost = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    const error = new HttpError(
      "Invaild inputs passed, plase check your data.",
      422
    );
    return next(error);
  }

  const postId = req.params.id;
  const { title, question } = req.body;

  let post;
  try {
    post = await Post.findById(postId).populate("creator");
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Updating post fild, could not update post.", 500)
    );
  }

  //extra secure if somone have generate token and send to delete post for another one !
  console.log(req.userData.userId);
  console.log(post.creator);
  if (post.creator._id.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this post.", 401));
  }

  post.title = title;
  post.question = question;

  try {
    await post.save();
  } catch (err) {
    const error = new HttpError("Updating post fild, please try again.", 500);
    return next(error);
  }

  return res.status(200).json({ post: post.toObject({ getters: true }) });
};

const deletePost = async (req, res, next) => {
  const postId = req.params.id;
  let post;
  try {
    post = await Post.findById(postId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Somthing went wrong, could not delete post",
      500
    );
    return next(error);
  }

  if (!post) {
    return next(new HttpError("Could not find post for this id.", 404));
  }

  if (post.creator.id !== req.userData.userId) {
    return next(new HttpError("You are not allowed to delete this post.", 401));
  }

  const imagePath = post.imageUrl;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await Answer.deleteMany({ postId: postId }, { session });
    await post.deleteOne({ session: session });
    post.creator.posts.pull(post._id);
    await post.creator.save({ session: session });

    await session.commitTransaction();
    await session.endSession();
  } catch (err) {
    return next(
      new HttpError("Somthing went wrong, could not delete post", 500)
    );
  }

  if (imagePath !== "") {
    fs.unlink(imagePath, (err) => {
      console.log(err);
    });
  }

  res.status(200).json({ message: "Post deleted successfully." });
};

const toggleLike = async (req, res, next) => {
  const { userId } = req.body;
  const postId = req.params.id;

  try {
    const post = await Post.findById(postId).populate("creator");
    const user = await User.findById(userId);

    if (!post) {
      return next(new HttpError("Post not found for the provided ID.", 404));
    }

    if (!user) {
      return next(new HttpError("User not found for the provided ID.", 404));
    }

    const alreadyLiked = post.likes.includes(userId);
    const isSelfLike = post.creator._id.toString() === userId;

    if (alreadyLiked) {
      post.likes.pull(userId);

      // Remove existing like notification
      await Notification.deleteOne({
        entityId: postId,
        sender: userId,
        receiver: post.creator._id,
        type: "like",
      });
    } else {
      post.likes.push(userId);

      // Create notification if it's not a self-like
      if (!isSelfLike) {
        const notification = new Notification({
          type: "like",
          postId,
          sender: userId,
          receiver: post.creator._id,
          isRead: false,
          entityId: postId,
        });
        await notification.save();
      }
    }

    await post.save();

    return res.status(200).json(post.toObject({ getters: true }));
  } catch (err) {
    console.error(err);
    return next(new HttpError("Something went wrong, please try again.", 500));
  }
};

module.exports = {
  getAllPosts,
  getPostById,
  getPostsByUserId,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
};
