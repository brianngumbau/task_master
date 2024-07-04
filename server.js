import express from "express";
import session from "express-session";
import passport from "passport";
import bcrypt from "bcrypt";
import pg from "pg";
import env from "dotenv";
import { Strategy } from "passport-local";
import { exec } from "child_process";

const app = express();
const port = process.env.PORT || 3000; // Ensure this matches the port used in index.js
const saltRounds = 10;
env.config();

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
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

// Routes
app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
}));

app.post("/signup", async (req, res) => {
    const { email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await db.query("INSERT INTO users (email, password) VALUES ($1, $2)", [email, hashedPassword]);
        res.redirect("/login");
    } catch (error) {
        console.log(error);
        res.redirect("/signup");
    }
});

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/login");
    });
});

// Importing routes from index.js
import indexRoutes from "./index.js";
app.use(indexRoutes);

// Starting server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});



