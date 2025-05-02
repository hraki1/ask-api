const express = require("express");
const { check } = require("express-validator");

const answerConreoller = require("../controllers/answer-controller");

const router = express.Router();

router.get("/", answerConreoller.getAllAnswers);

router.get("/:id", answerConreoller.getAnswerById);

router.get("/user/:uid", answerConreoller.getAnswersByUserId);

router.post(
  "/",
  [check("answer").not().isEmpty()],
  answerConreoller.createAnswer
);

router.patch(
  "/:id",
  [check("answer").not().isEmpty()],
  answerConreoller.updateAnswer
);

router.delete("/:id", answerConreoller.deleteAnswer);

module.exports = router;
