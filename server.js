import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import env from "dotenv";
import pg from "pg";
import bcrypt from "bcrypt";

const app = express();
const port = 3000;
const API_URL = "http://localhost:4000";
const saltRounds = 10;
env.config();



app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "taskmaster",
    password: "918190",
    port: 5432
});
db.connect();

//main page
app.get("/", async (req, res) => {
  try {
    const result = await axios.get(`${API_URL}/tasks`);
    console.log(result.data);
    res.render("index.ejs", { tasks: result.data });
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks"});
  }
});

//new task page and edit task page
app.get("/new", (req, res) => {
    res.render("modify.ejs", { heading: "New Task", submit: "Create New Task"});
});

app.get("/edit/:id", async (req, res) => {
    try {
        const result = await axios.get(`${API_URL}/tasks/${req.params.id}`);
        console.log(result.data);
        res.render("modify.ejs", {
            heading: "Edit Task",
            submit: "Update Task",
            task: result.data[0],
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching task"});
    }
});


app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/logout", (req, res) => {

})

app.get("/register", (req, res) => {
    res.render("signup.ejs");
});

app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    const confirmpassword = req.body.confirmpassword;

    try {
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (checkResult.rows.length > 0) {
            res.send("Email already exists!Try logging in");

        } else {
            if (confirmpassword === password) {
                bcrypt.hash(password, saltRounds, async (error, hash) => {
                    if (error) {
                        console.error("Error hashing password:", error);
                    } else {
                        console.log("Hashed Password:", hash);
                        await db.query("INSERT INTO users (email, password) VALUES ($1, $2)", 
                            [email, hash]
                        );
                        res.redirect("/");
                    }
                })
            } else {
                res.send("Passwords do not match")
            }
        }
    } catch (error) {
        console.log(error)
    }

});

app.post("/login", async (req, res) => {
    const email = req.body.username;
    const loginPassword = req.body.password;

    try {
        const result = await db.query("SELECT * FROM users WHERE email = ($1)", [email]);

        if (result.rows.length > 0) {
            console.log(result.rows);
            const user = result.rows[0];
            const savedHashedPassword = user.password;

            bcrypt.compare(loginPassword, savedHashedPassword, (error, result) => {
                if (error) {
                    console.error("Error comparing passwords:", error);
                } else {
                    if (result) {
                        res.redirect("/");
                    } else {
                        res.send("Incorrect Password");
                    }
                }
            });
        } else {
            res.send("User not found")
        }
    } catch (error) {
        console.log(error)
    }
});


// creating new task
app.post("/api/tasks", async (req, res) => {
    try {
        const result = await axios.post(`${API_URL}/tasks`, req.body);
        console.log(result.data);
        res.redirect("/");
    } catch (error) {
        res.status(500).json({ message: "Error creating task"});
    }
});

// updating a task(partially)
app.post("/api/tasks/:id", async (req, res) => {
    try {
        const result = await axios.patch(`${API_URL}/tasks/${req.params.id}`, req.body);
        console.log(result.data);
        res.redirect("/");
    } catch (error) {
        res.status(500).json({ message: "Error updating task"});
    }
});

//deleting a task
app.get("/api/tasks/delete/:id", async (req, res) => {
    try {
        await axios.delete(`${API_URL}/tasks/${req.params.id}`);
        res.redirect("/");
    } catch (error) {
        res.status(500).json({ message: "Error deleting task" });
    }
});

app.listen(port, () => {
    console.log(`Backend is running at http://localhost:${port}`);
});



