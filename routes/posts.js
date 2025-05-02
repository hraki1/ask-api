const express = require("express");
const postsController = require("../controllers/posts-controllers");
const { check } = require("express-validator");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/", postsController.getAllPosts);
router.get("/:id", postsController.getPostById);
router.get("/user/:uid", postsController.getPostsByUserId);

router.use(checkAuth);

router.post(
  "/",
  fileUpload.single("image"),
  [(check("title").not().isEmpty(), check("question").isLength({ min: 5 }))],
  postsController.createPost
);

router.patch("/like/:id", postsController.toggleLike);

router.patch(
  "/:id",
  [check("title").not().isEmpty()],
  check("question").isLength({ min: 5 }),
  postsController.updatePost
);

router.delete("/:id", postsController.deletePost);

module.exports = router;
