import { Router } from "express";
import { getConversation, getMessageContacts, sendMessage } from "../controllers/messageController.js";

const router = Router();

router.get("/contacts", getMessageContacts);
router.get("/:userId", getConversation);
router.post("/:userId", sendMessage);

export default router;
