import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import env from "dotenv";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import session from "express-session";
import { Strategy } from "passport-local";

const app = express();
const port = 3000;
const API_URL = "http://localhost:4000";
const saltRounds = 10;
env.config();

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



app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/*
const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect(); 
*/

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

//main page
app.get("/", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user.id;
            const result = await axios.get(`${API_URL}/tasks/user/${userId}`);
            console.log("Tasks from API:", result.data);
            res.render("index.ejs", { tasks: result.data });
          } catch (error) {
            console.error("Error fetching tasks:", error.response ? error.response.data : error.message);
            res.status(500).json({ message: "Error fetching tasks"});
            console.log(error)
          }
    } else {
        res.redirect("/login");
    } 
});

//new task page and edit task page
app.get("/new", (req, res) => {
    res.render("modify.ejs", { heading: "New Task", submit: "Create New Task"});
});

app.get("/edit/:id", async (req, res) => {
    if (req.isAuthenticated){
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
            res.status(500).json({ message: "Error fetching task"});
        }
    } else {
        res.redirect("/login");
    }
   
});


app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/logout", (req, res) => {
    req.logout(function (error) {
        if (error) {
            return next(error);
        }
        res.redirect("/register");
    });
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

app.post("/login",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
    })
);

passport.use(
    new Strategy(async function verify(username, password, cb) {
        try {
            const result = await db.query("SELECT * FROM users WHERE email = ($1)", [username]);
    
            if (result.rows.length > 0) {
                console.log(result.rows);
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
            console.log(error)
        }
    })
)
// creating new task
app.post("/api/tasks", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user.id;
            const result = await axios.post(`${API_URL}/tasks/user/${userId}`, req.body);
            console.log(result.data);
            res.redirect("/");
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Error creating task"});
        }
    } else {
        res.redirect("/login");
    }
  
});

// updating a task(partially)
app.post("/api/tasks/:id", async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const userId = req.user.id;
            const result = await axios.patch(`${API_URL}/tasks/${req.params.id}/user/${userId}`, req.body);
            console.log(result.data);
            res.redirect("/");
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Error updating task"});
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

passport.serializeUser((user, cb) => {
    cb(null, user);
});

passport.deserializeUser((user, cb) => {
    cb(null, user);
});

app.listen(port, () => {
    console.log(`Backend is running at http://localhost:${port}`);
});



