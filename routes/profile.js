const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");
const fileUpload = require("../middleware/file-upload");
const profileController = require("../controllers/profile-controller");

const router = express.Router();

router.use(checkAuth);

router.patch(
  "/",
  fileUpload.single("image"),
  [
    check("userId").not().isEmpty(),
    check("name").not().isEmpty(),
    check("bio").not().isEmpty(),
  ],
  profileController.updateProfile
);

router.patch("/save/:id", profileController.savePost);
router.patch("/unsave/:id", profileController.unSavePost);

module.exports = router;
