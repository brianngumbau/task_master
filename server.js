import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import bcrypt from "bcrypt";
import pg from "pg";
import env from "dotenv";
import axios from "axios";
import { Strategy } from "passport-local";


const app = express();
const port = process.env.PORT || 3000; 
const API_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const saltRounds = 10;
env.config();

//Database connection setup
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

// Middleware setup
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 100000
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

//User authentication
// Passport configuration
passport.use(
    new Strategy(async function verify(username, password, cb) {
        try {
            const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
            if (result.rows.length > 0) {
                const user = result.rows[0];
                const savedHashedPassword = user.password;
                bcrypt.compare(password, savedHashedPassword, (error, valid) => {
                    if (error) {
                        console.error("Error comparing passwords:", error);
                        return cb(error);
                    } else {
                        if (valid) {
                            return cb(null, user);
                        } else {
                            return cb(null, false);
                        }
                    }
                });
            } else {
                return cb("User not found");
            }
        } catch (error) {
            console.log(error);
            return cb(error);
        }
    })
);

passport.serializeUser((user, cb) => {
    cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        const user = result.rows[0];
        cb(null, user);
    } catch (error) {
        cb(error);
    }
});


//login page
app.get("/login", (req, res) => {
    res.render("login.ejs");
});

//logout logic
app.get("/logout", (req, res) => {
    req.logout(function (error) {
        if (error) {
            return next(error);
        }
        res.redirect("/register");
    });
});

//register(signup) page
app.get("/register", (req, res) => {
    res.render("signup.ejs");
});

//login authentication
app.post("/login", 
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
}));

//signup logic
app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    const confirmpassword = req.body.confirmpassword;

    try {
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (checkResult.rows.length > 0) {
            res.redirect("/login");
        } else {
            if (confirmpassword === password) {
                bcrypt.hash(password, saltRounds, async (error, hash) => {
                    if (error) {
                        console.error("Error hashing password:", error);
                    } else {
                        const result = await db.query(
                            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *", 
                            [email, hash]
                        );
                        const user = result.rows[0];
                        req.login(user, (error) => {
                            console.log("success");
                            res.redirect("/");
                        });
                    }
                })
            } else {
                res.send("Passwords do not match")
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Error registering user");
    }

});

//Task management routes
//backend server routes
//main page route(user task list)
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
        res.redirect("/register");
    }
});

//new task page
app.get("/new", (req, res) => {
    res.render("modify.ejs", { heading: "New Task", submit: "Create New Task" });
});

//edit task page
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

//posting new task
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

//updating a taskpartially
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

//deleting a task 
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

//API ROUTES
//retrieving a user's tasks from the database
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

//getting specific user task by id 
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

//creating new user task into the databse 
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

//updating user task into the databse
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

//deleting user task in the databse
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
// Starting server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});



