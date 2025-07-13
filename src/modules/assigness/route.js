import express from "express";
import {
  getAllAssignees,
  getAssigneeById,
  createAssignee,
  updateAssignee,
  deleteAssignee,
} from "./controller.js";

const assigneesRouter = express.Router();

// GET: /api/assignees - Get all assignees
assigneesRouter.get("/", getAllAssignees);

// GET: /api/assignees/:id - Get assignee by ID
assigneesRouter.get("/:id", getAssigneeById);

// POST: /api/assignees - Create new assignee
assigneesRouter.post("/", createAssignee);

// PUT: /api/assignees/:id - Update assignee
assigneesRouter.put("/:id", updateAssignee);

// DELETE: /api/assignees/:id - Delete assignee
assigneesRouter.delete("/:id", deleteAssignee);

export default assigneesRouter;
