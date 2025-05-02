const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const Post = require("../model/post");
const User = require("../model/user");
const Answer = require("../model/answer");
const Notification = require("../model/notification");

const HttpError = require("../model/http-error");

const getAllAnswers = async (req, res, next) => {
  let answers;
  try {
    answers = await Answer.find().sort({ createdAt: -1 }).exec(); //use exec() to retun real promies
  } catch (err) {
    console.log(err);
    const error = HttpError(
      "Somthing went wrong, could not find a answers",
      500
    );
    return next(error);
  }

  if (!answers || answers.length === 0) {
    return next(HttpError("Could not find a posts", 404));
  }

  return res.status(200).json({
    answers: answers.map((post) => post.toObject({ getters: true })),
  });
};

const getAnswerById = async (req, res, next) => {
  const answerId = req.params.id;

  let answer;
  try {
    answer = await Answer.findById(answerId); //use exec() to retun real promies
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Somthing went wrong, could not find a answer",
      500
    );
    return next(error);
  }

  if (!answer) {
    return next(new HttpError("Could not find a answer for provided id.", 404));
  }

  return res.status(200).json({ answer: answer.toObject({ getters: true }) });
};

const getAnswersByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let answers;
  try {
    answers = await Answer.find({ creator: userId })
      .populate("creator")
      .populate("postId")
      .sort({ createdAt: -1 })
      .exec(); //use exec() to retun real promies
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Somthing went wrong, please try agin later", 500)
    );
  }
  if (!answers) {
    return next(
      new HttpError("Could not find a answers for provided user id.", 404)
    );
  }

  res.status(200).json({
    answers: answers.map((answer) => answer.toObject({ getters: true })),
  });
};

const createAnswer = async (req, res, next) => {
  console.log("create answers");
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    const error = new HttpError(
      "Invaild inputs passed, plase check your data.",
      422
    );
    return next(error);
  }

  const { answer, author, creator, postId } = req.body;

  const createdAnswer = new Answer({
    answer,
    author,
    creator,
    postId,
  });

  let user, post, postOwner;
  try {
    user = await User.findById(creator);
    post = await Post.findById(postId).populate("creator");
    postOwner = post.creator;
  } catch (err) {
    const error = new HttpError("Creating post fild, please try again.", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id.", 404);
    return next(error);
  }

  if (!post) {
    const error = new HttpError("Could not find post for provided id.", 404);
    return next(error);
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    // Save the answer
    await createdAnswer.save({ session: session });

    // Update post and user
    post.answers.push(createdAnswer);
    user.answers.push(createdAnswer);
    await post.save({ session: session });
    await user.save({ session: session });

    // Create notification for the post owner
    if (postOwner._id.toString() !== creator.toString()) {
      const notification = new Notification({
        type: "answer",
        isRead: false,
        sender: creator,
        receiver: postOwner._id,
        entityId: createdAnswer._id,
        postId: postId,
      });
      await notification.save({ session: session });
    }

    await session.commitTransaction();
    await session.endSession();
  } catch (err) {
    console.log(err);
    const error = new HttpError("Creating answer fild, please try again.", 500);
    return next(error);
  }

  return res
    .status(201)
    .json({ answer: createdAnswer.toObject({ getters: true }) });
};

const updateAnswer = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    const error = new HttpError(
      "Invaild inputs passed, plase check your data.",
      422
    );
    return next(error);
  }

  const answerId = req.params.id;
  const { answer } = req.body;

  let answerObj;
  try {
    answerObj = await Answer.findById(answerId);
  } catch (err) {
    console.log(err);
    return next(
      new HttpError("Updating post fild, could not update post.", 500)
    );
  }
  answerObj.answer = answer;

  try {
    await answerObj.save();
  } catch (err) {
    const error = new HttpError("Updating post fild, please try again.", 500);
    return next(error);
  }

  return res
    .status(200)
    .json({ answer: answerObj.toObject({ getters: true }) });
};

const deleteAnswer = async (req, res, next) => {
  const answerId = req.params.id;

  let answer;
  try {
    answer = await Answer.findById(answerId)
      .populate("postId")
      .populate("creator");
  } catch (err) {
    return next(
      new HttpError(
        "Something went wrong, could not delete answer (step 1)",
        500
      )
    );
  }

  let relatedNotification = await Notification.find({
    type: "answer",
    entityId: answerId,
  });

  if (!answer) {
    return next(new HttpError("Could not find answer for this ID.", 404));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    // Remove the answer from the database
    await Answer.deleteOne({ _id: answerId }, { session });

    // Remove the answer reference from post and user
    answer.postId.answers.pull(answer._id);
    answer.creator.answers.pull(answer._id);

    await answer.postId.save({ session });
    await answer.creator.save({ session });
    if (relatedNotification.length > 0) {
      await Notification.deleteMany(
        {
          type: "answer",
          entityId: answerId,
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Answer deleted successfully." });
  } catch (err) {
    console.error(err);
    return next(
      new HttpError(
        "Something went wrong, could not delete answer (step 2)",
        500
      )
    );
  }
};

module.exports = {
  getAllAnswers,
  getAnswerById,
  getAnswersByUserId,
  createAnswer,
  updateAnswer,
  deleteAnswer,
};
