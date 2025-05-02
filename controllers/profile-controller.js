const fs = require("fs");
const { validationResult } = require("express-validator");

const HttpError = require("../model/http-error");
const User = require("../model/user");
const Post = require("../model/post");

const updateProfile = async (req, res, next) => {
  const errors = validationResult(req);

  // Check for validation errors
  if (!errors.isEmpty()) {
    console.log("Validation Errors:", errors.array());

    // Delete uploaded image if validation fails
    if (req?.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.log("Failed to delete uploaded image:", err);
      });
    }

    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { name, bio, userId } = req.body;

  let existingUser;
  try {
    existingUser = await User.findById(userId);
  } catch (err) {
    console.log("Error finding user:", err);
    return next(
      new HttpError("Fetching user failed, please try again later.", 500)
    );
  }

  if (!existingUser) {
    return next(
      new HttpError("User does not exist, please login instead.", 422)
    );
  }

  // Authorization check
  if (existingUser.id.toString() !== req.userData.userId) {
    return next(
      new HttpError("You are not allowed to edit this profile.", 401)
    );
  }

  // Update user data
  existingUser.name = name;
  existingUser.bio = bio;

  // If new image uploaded
  if (req.file?.path) {
    // Delete old image if it exists
    if (existingUser.imageUrl) {
      fs.unlink(existingUser.imageUrl, (err) => {
        if (err) console.log("Failed to delete old image:", err);
      });
    }

    existingUser.imageUrl = req.file.path;
  }

  // Save updated user
  try {
    await existingUser.save();
  } catch (err) {
    console.log("Error saving user:", err);
    return next(
      new HttpError("Updating profile failed, please try again.", 500)
    );
  }

  let user;
  try {
    user = await User.findById(userId)
      .populate({
        path: "posts",
        options: { sort: { createdAt: -1 } },
        populate: { path: "creator", select: "name bio imageUrl" }, // populate creator of each post
      })
      .populate({
        path: "answers",
        options: { sort: { createdAt: -1 } },
        populate: { path: "creator", select: "name imageUrl" }, // populate creator of each answer
      })
      .populate({
        path: "savedPosts",
        options: { sort: { createdAt: -1 } },
        populate: { path: "creator", select: "name bio imageUrl" }, // populate creator of each answer
      });
  } catch (err) {
    console.log("Error finding user:", err);
    return next(
      new HttpError("Fetching user failed, please try again later.", 500)
    );
  }

  return res.status(200).json(user.toObject({ getters: true }));
};

const savePost = async (req, res, next) => {
  const userId = req.params.id;
  const { postId } = req.body;

  let existingPost;
  let existingUser;
  try {
    existingPost = await Post.findById(postId);
    existingUser = await User.findById(userId);
  } catch (err) {
    console.log("Error finding user:", err);
    return next(
      new HttpError("Fetching post failed, please try again later.", 500)
    );
  }

  if (!existingPost) {
    return next(new HttpError("post does not exist", 422));
  }

  // Authorization check
  if (existingUser.id.toString() !== req.userData.userId) {
    return next(
      new HttpError("You are not allowed to edit this profile.", 401)
    );
  }

  // Update user data
  existingUser.savedPosts.push(existingPost);

  // Save updated user
  try {
    await existingUser.save();
  } catch (err) {
    console.log("Error saving user:", err);
    return next(
      new HttpError("Updating profile failed, please try again.", 500)
    );
  }

  return res.status(200).json(existingUser.toObject({ getters: true }));
};

const unSavePost = async (req, res, next) => {
  const userId = req.params.id;
  const { postId } = req.body;

  try {
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return next(new HttpError("User not found", 404));
    }

    // Authorization check
    if (existingUser.id.toString() !== req.userData.userId) {
      return next(
        new HttpError(
          "You are not authorized to modify this user's saved posts.",
          401
        )
      );
    }

    const postIndex = existingUser.savedPosts.indexOf(postId);

    if (postIndex === -1) {
      return next(new HttpError("Post is not saved.", 404));
    }

    // Remove postId from savedPosts
    existingUser.savedPosts.splice(postIndex, 1);

    await existingUser.save();

    return res.status(200).json({
      message: "Post unsaved successfully.",
      savedPosts: existingUser.savedPosts,
    });
  } catch (err) {
    console.log("Error unsaving post:", err);
    return next(
      new HttpError("Unsave operation failed, please try again later.", 500)
    );
  }
};

module.exports = {
  updateProfile,
  savePost,
  unSavePost,
};
