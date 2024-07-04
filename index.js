import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;
const API_URL = "http://localhost:3000";

const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect((err) => {
    if (err) {
        console.error("Connection error", err.stack);
    } else {
        console.log("Connected to the database");
    }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user.id;
            const result = await axios.get(`${API_URL}/tasks/user/${userId}`);
            console.log("Tasks from API:", result.data);
            res.render("index.ejs", { tasks: result.data });
        } catch (error) {
            console.error("Error fetching tasks:", error.response ? error.response.data : error.message);
            res.status(500).json({ message: "Error fetching tasks" });
            console.log(error);
        }
    } else {
        res.redirect("/login");
    }
});

app.get("/new", (req, res) => {
    res.render("modify.ejs", { heading: "New Task", submit: "Create New Task" });
});

app.get("/edit/:id", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user.id;
            const result = await axios.get(`${API_URL}/tasks/${req.params.id}/user/${userId}`);
            console.log(result.data);
            res.render("modify.ejs", {
                heading: "Edit Task",
                submit: "Update Task",
                task: result.data,
            });
        } catch (error) {
            res.status(500).json({ message: "Error fetching task" });
        }
    } else {
        res.redirect("/login");
    }
});

app.post("/api/tasks", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user.id;
            const result = await axios.post(`${API_URL}/tasks/user/${userId}`, req.body);
            console.log(result.data);
            res.redirect("/");
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Error creating task" });
        }
    } else {
        res.redirect("/login");
    }
});

app.post("/api/tasks/:id", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user.id;
            const result = await axios.patch(`${API_URL}/tasks/${req.params.id}/user/${userId}`, req.body);
            console.log(result.data);
            res.redirect("/");
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Error updating task" });
        }
    } else {
        res.redirect("/login");
    }
});

app.get("/api/tasks/delete/:id", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user.id;
            await axios.delete(`${API_URL}/tasks/delete/${req.params.id}/user/${userId}`);
            res.redirect("/");
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Error deleting task" });
        }
    } else {
        res.redirect("/login");
    }
});

app.get("/tasks/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    console.log(userId);
    try {
        const result = await db.query("SELECT * FROM tasks WHERE user_id = $1 ORDER BY id ASC", [userId]);
        const tasks = result.rows;
        console.log(tasks);
        res.json(tasks);
    } catch (error) {
        console.log(error);
    }
});

app.get("/tasks/:id/user/:userId", async (req, res) => {
    const id = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    try {
        const result = await db.query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [id, userId]);
        const task = result.rows[0];
        console.log(task);
        res.json(task);
    } catch (error) {
        console.log(error);
    }
});

app.post("/tasks/user/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const newTask = {
        title: req.body.title,
        duedate: req.body.duedate,
        description: req.body.description,
        category: req.body.category,
    };
    try {
        await db.query(
            "INSERT INTO tasks (title, duedate, category, description, user_id) VALUES ($1, $2, $3, $4, $5)", 
            [req.body.title, req.body.duedate, req.body.category, req.body.description, userId]
        );
        res.status(201).json(newTask);
    } catch (error) {
        console.log(error);
    }
});

app.patch("/tasks/:id/user/:userId", async (req, res) => {
    const taskId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    try {
        const result = await db.query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [taskId, userId]);
        const existingTask = result.rows[0];

        if (!existingTask) {
            return res.status(404).json({ error: "Task not found" });
        }
        const updatedTask = {
            id: taskId,
            title: req.body.title || existingTask.title,
            duedate: req.body.duedate || existingTask.duedate,
            description: req.body.description || existingTask.description,
            category: req.body.category || existingTask.category,
        };
        await db.query(
            "UPDATE tasks SET title = $1, duedate = $2, category = $3, description = $4 WHERE id = $5",
            [updatedTask.title, updatedTask.duedate, updatedTask.category, updatedTask.description, taskId]
        );
        res.json(updatedTask);
    } catch (error) {
        console.log(error);
    }
});

app.delete("/tasks/delete/:id/user/:userId", async (req, res) => {
    const id = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    try {
        await db.query("DELETE FROM tasks WHERE id = $1 AND user_id = $2", [id, userId]);
        res.status(204).end();
    } catch (error) {
        console.log(error);
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
