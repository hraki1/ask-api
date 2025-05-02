const express = require("express");
const notificationController = require("../controllers/notification-controller");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/", notificationController.getAllNotifications);
router.get("/user/:uid", notificationController.getNotificationsByUserId);

router.use(checkAuth);

router.delete("/:id", notificationController.DeleteNotification);
router.patch("/:id", notificationController.readNotification);



module.exports = router;
