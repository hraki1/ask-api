const express = require("express");
const usersController = require("../controllers/users-Controller");
const { check } = require("express-validator");
const router = express.Router();

router.get("/", usersController.getUsers);

router.get("/:id", usersController.getUserById);

router.post(
  "/signup",
  [
    check("name").not().isEmpty(),
    check("email")
      .normalizeEmail() // Test@test.com => test@test.com
      .isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  usersController.signup
);

router.post(
  "/login",
  [
    check("email")
      .normalizeEmail() // Test@test.com => test@test.com
      .isEmail(),
  ],
  usersController.login
);

module.exports = router;
