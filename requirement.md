# Simple Task API - CRUD Practice

## Overview
A simple RESTful API for managing tasks using Node.js and Express.js. Perfect for practicing basic CRUD operations.

## Tech Stack
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Basic express validation

## Database Schema

### Task Model
```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String (optional),
  completed: Boolean (default: false),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

## API Endpoints

### 1. GET /api/tasks
**Get all tasks**
```javascript
// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "_id": "64f1234567890abcdef12345",
      "title": "Learn Node.js",
      "description": "Complete Node.js tutorial",
      "completed": false,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "_id": "64f1234567890abcdef12346",
      "title": "Build REST API",
      "description": "Create CRUD operations",
      "completed": true,
      "createdAt": "2024-01-02T10:00:00.000Z",
      "updatedAt": "2024-01-02T15:00:00.000Z"
    }
  ]
}
```

### 2. GET /api/tasks/:id
**Get single task by ID**
```javascript
// Response (200 OK)
{
  "success": true,
  "data": {
    "_id": "64f1234567890abcdef12345",
    "title": "Learn Node.js",
    "description": "Complete Node.js tutorial",
    "completed": false,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z"
  }
}

// Response (404 Not Found)
{
  "success": false,
  "message": "Task not found"
}
```

### 3. POST /api/tasks
**Create new task**
```javascript
// Request Body
{
  "title": "Learn MongoDB",
  "description": "Study MongoDB basics"
}

// Response (201 Created)
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "64f1234567890abcdef12347",
    "title": "Learn MongoDB",
    "description": "Study MongoDB basics",
    "completed": false,
    "createdAt": "2024-01-03T10:00:00.000Z",
    "updatedAt": "2024-01-03T10:00:00.000Z"
  }
}

// Response (400 Bad Request)
{
  "success": false,
  "message": "Title is required"
}
```

### 4. PUT /api/tasks/:id
**Update existing task**
```javascript
// Request Body
{
  "title": "Learn Node.js & Express",
  "description": "Complete Node.js and Express tutorial",
  "completed": true
}

// Response (200 OK)
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "_id": "64f1234567890abcdef12345",
    "title": "Learn Node.js & Express",
    "description": "Complete Node.js and Express tutorial",
    "completed": true,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-03T11:00:00.000Z"
  }
}

// Response (404 Not Found)
{
  "success": false,
  "message": "Task not found"
}
```

### 5. DELETE /api/tasks/:id
**Delete task**
```javascript
// Response (200 OK)
{
  "success": true,
  "message": "Task deleted successfully"
}

// Response (404 Not Found)
{
  "success": false,
  "message": "Task not found"
}
```

## Basic Implementation Structure

### Project Structure
```
task-api/
├── server.js
├── models/
│   └── Task.js
├── routes/
│   └── tasks.js
├── middleware/
│   └── validation.js
└── package.json
```

### Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

### Environment Variables
```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/simple-task-api
```

### Sample Routes Implementation
```javascript
// routes/tasks.js
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    
    const task = new Task({ title, description });
    await task.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Task created successfully',
      data: task 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, description, completed } = req.body;
    
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, completed },
      { new: true, runValidators: true }
    );
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Task updated successfully',
      data: task 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

## HTTP Status Codes

### Success Codes
- **200 OK**: Successful GET, PUT, DELETE requests
- **201 Created**: Successful POST requests

### Error Codes
- **400 Bad Request**: Invalid request data
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

## Testing with curl

```bash
# Get all tasks
curl -X GET http://localhost:3000/api/tasks

# Get single task
curl -X GET http://localhost:3000/api/tasks/64f1234567890abcdef12345

# Create new task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "New Task", "description": "Task description"}'

# Update task
curl -X PUT http://localhost:3000/api/tasks/64f1234567890abcdef12345 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Task", "completed": true}'

# Delete task
curl -X DELETE http://localhost:3000/api/tasks/64f1234567890abcdef12345
```

This simple API provides all basic CRUD operations for practicing with Node.js and Express.js!
