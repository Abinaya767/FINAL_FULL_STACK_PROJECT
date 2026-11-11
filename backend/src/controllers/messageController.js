import mongoose from "mongoose";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import { badRequest, notFound, requireObjectId } from "../utils/mongo.js";

function messageDto(message) {
  return {
    id: message._id.toString(),
    sender: message.sender?._id?.toString() ?? message.sender?.toString(),
    senderName: message.sender?.name,
    recipient: message.recipient?._id?.toString() ?? message.recipient?.toString(),
    recipientName: message.recipient?.name,
    content: message.content,
    createdAt: message.createdAt,
  };
}

export const getMessageContacts = asyncHandler(async (request, response) => {
  const otherRole = request.user.role === "admin" ? "student" : "admin";
  const users = await User.find({ role: otherRole }).select("_id name email role").sort({ name: 1 }).limit(200).lean();
  const contacts = users.map((user) => ({
    id: user._id.toString(), name: user.name, email: user.email, role: user.role,
  }));
  response.status(200).json(apiResponse("Chat contacts retrieved successfully.", { contacts }));
});

export const getConversation = asyncHandler(async (request, response) => {
  const otherId = requireObjectId(request.params.userId, "Contact ID");
  if (otherId.equals(request.user.id)) throw badRequest("You cannot open a conversation with yourself.");
  const other = await User.findById(otherId).select("_id role");
  if (!other) throw notFound("Chat contact not found.");
  const allowedRole = request.user.role === "admin" ? "student" : "admin";
  if (other.role !== allowedRole) throw Object.assign(new Error("You may chat only with an authorized LearnSpace contact."), { status: 403 });
  const messages = await Message.find({
    $or: [
      { sender: request.user.id, recipient: otherId },
      { sender: otherId, recipient: request.user.id },
    ],
  }).populate("sender", "name").populate("recipient", "name").sort({ createdAt: 1 }).limit(200).lean();
  response.status(200).json(apiResponse("Conversation retrieved successfully.", {
    messages: messages.map(messageDto),
  }));
});

export const sendMessage = asyncHandler(async (request, response) => {
  const recipientId = requireObjectId(request.params.userId, "Contact ID");
  if (recipientId.equals(request.user.id)) throw badRequest("You cannot send a message to yourself.");
  const content = request.body?.content;
  if (typeof content !== "string" || !content.trim()) throw badRequest("Message content is required.");
  if (content.trim().length > 2000) throw badRequest("Messages cannot exceed 2000 characters.");
  const recipient = await User.findById(recipientId).select("_id name role");
  if (!recipient) throw notFound("Chat contact not found.");
  const allowedRole = request.user.role === "admin" ? "student" : "admin";
  if (recipient.role !== allowedRole) throw Object.assign(new Error("You may message only an authorized LearnSpace contact."), { status: 403 });
  const message = await Message.create({
    sender: new mongoose.Types.ObjectId(request.user.id),
    recipient: recipientId,
    content: content.trim(),
  });
  await message.populate("sender", "name");
  await message.populate("recipient", "name");
  const dto = messageDto(message);
  const io = request.app.get("io");
  io?.to(`user:${recipientId.toString()}`).emit("message:new", dto);
  io?.to(`user:${request.user.id}`).emit("message:new", dto);
  response.status(201).json(apiResponse("Message sent successfully.", { message: dto }));
});
