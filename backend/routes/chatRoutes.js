const express = require("express");
const router = express.Router();
const { chatWithPsychic,getChatMessagesById,getAllUserChats,deleteChatById,  getChatHistory,getUserChatDetails  } = require("../controllers/chatController");
const { protect } = require("../middleware/auth");
const { adminProtect } = require("../middleware/adminProtect");

router.post("/:psychicId", protect, chatWithPsychic);
router.get("/user/:userId", protect, getUserChatDetails);

router.get("/:psychicId", protect, getChatHistory);
router.get("/admin/all-chats", adminProtect, getAllUserChats);
router.get("/admin/chat/:chatId", adminProtect, getChatMessagesById);
router.delete("/admin/chat/:chatId", adminProtect, deleteChatById);

module.exports = router;