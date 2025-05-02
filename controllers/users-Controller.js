const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../model/http-error");
const User = require("../model/user");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password -name -_id");
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }

  res
    .status(200)
    .json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const getUserById = async (req, res, next) => {
  const id = req.params.id;

  let user;
  try {
    user = await User.findById(id)
      .populate({
        path: "posts",
        options: { sort: { createdAt: -1 } },
        populate: { path: "creator", select: "name bio imageUrl" },
      })
      .populate({
        path: "answers",
        options: { sort: { createdAt: -1 } },
        populate: [
          { path: "creator", select: "name imageUrl" },
          { path: "postId" },
        ],
      })
      .populate({
        path: "savedPosts",
        options: { sort: { createdAt: -1 } },
        populate: { path: "creator", select: "name bio imageUrl" },
      });
  } catch (err) {
    const error = new HttpError(
      "Fetching user failed, please try again later.",
      500
    );
    return next(error);
  }

  res.status(200).json(user.toObject({ getters: true }));
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  console.log(req.body);

  if (!errors.isEmpty()) {
    console.log(errors);
    const error = new HttpError(
      "Invaild inputs passed, plase check your data.",
      422
    );
    return next(error);
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up faild, please try agian later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    return next(
      new HttpError("User exsist already, please login instead.", 422)
    );
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError("Could not create user, please try agian", 500));
  }

  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    imageUrl: "",
    bio: "",
    posts: [],
    answers: [],
    savedPosts: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    console.log(err);
    const error = new HttpError("Signing up fild, please try again.", 500);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      {
        expiresIn: "1d",
      }
    );
  } catch (err) {
    return next(new HttpError("Signing up fild, please try again.", 500));
  }

  // return res
  //   .status(201)
  //   .json({ user: createdUser.toObject({ getters: true }) });

  return res
    .status(201)
    .json({ user: createdUser.toObject({ getters: true }), token: token });
};

const login = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    const error = new HttpError(
      "Invaild inputs passed, plase check your data.",
      422
    );
    return next(error);
  }

  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return next(
      new HttpError("Signing up faild, please try agian later.", 500)
    );
  }

  if (!existingUser) {
    return next(
      new HttpError("Invailid credentials, coould not log in you", 403)
    );
  }

  let isVaildPassword = false;
  try {
    isVaildPassword = await bcrypt.compareSync(password, existingUser.password);
  } catch (err) {
    new HttpError(
      "Could not log you in, Please check your credentials and try again.",
      500
    );
  }

  if (!isVaildPassword) {
    return next(
      new HttpError("Invailid credentials, coould not log in you", 403)
    );
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser._id, email: existingUser.email },
      process.env.JWT_KEY,
      {
        expiresIn: "1d",
      }
    );
  } catch (err) {
    console.log(err);
    return next(new HttpError("Signing up fild, please try again.", 500));
  }

  res.json({
    user: existingUser.toObject({ getters: true }),
    token: token,
  });
};

module.exports = {
  getUsers,
  getUserById,
  signup,
  login,
};
