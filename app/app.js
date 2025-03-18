const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session"); // <-- Import express-session

// Create express app
var app = express();

// Add static files location
app.use(express.static(path.join(__dirname, "..", "static")));

// Use the Pug templating engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'services', 'views'));

console.log("Views directory set to:", path.join(__dirname, 'services', 'views'));

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Set up sessions
app.use(session({
  secret: 'supersecretkey',  // replace with a secure secret in production
  resave: false,
  saveUninitialized: false
}));

// Get the functions in the db.js file to use
const db = require('./services/db');

// Create a route for root - /
app.get("/", function(req, res) {
    res.render("index", { title: "Home", user: req.session.user });
});

// Create a route for /signup
app.get("/signup", function(req, res) {
    res.render("signup", { title: "Sign Up", user: req.session.user });
});

// Create a route for /contact
app.get("/contact", function(req, res) {
    res.render("contact", { title: "Contact", user: req.session.user });
});

// Create a route for /features
app.get("/features", function(req, res) {
    res.render("features", { title: "Features", user: req.session.user });
});

// Create a route for /how_it_works
app.get("/how_it_works", function(req, res) {
    res.render("how_it_works", { title: "How It Works", user: req.session.user });
});

// Create a route for /login
app.get("/login", function(req, res) {
    res.render("login", { title: "Log In", user: req.session.user });
});

// Dashboard route (requires a logged-in user)
app.get("/dashboard", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.render("dashboard", { title: "Dashboard", user: req.session.user, name: req.session.user.name });
});
 
// Handle login process
app.post("/login_process", async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  
      if (result.length === 0) {
        return res.render("login", { title: "Log In", error: "Don't recognize credentials, please create an account.", user: req.session.user });
      }
  
      const user = result[0];
  
      if (user.password !== password) {
        return res.render("login", { title: "Log In", error: "Don't recognize credentials, please create an account.", user: req.session.user });
      }
  
      // Save user data in session
      req.session.user = {
          id: user.id,
          name: user.name,
          email: user.email
      };
  
      res.redirect("/dashboard");
    } catch (err) {
      console.error("Error in /login_process:", err);
      res.status(500).send("Error processing login");
    }
});
  
// Handle signup process
app.post("/signup_process", async function(req, res) {
  try {
    // Extract form data from req.body
    const { name, email, password, interests } = req.body;
    // If needed, confirm-password is available as req.body['confirm-password']

    // Insert into DB (ensure your "users" table exists with appropriate columns)
    const insertQuery = `
      INSERT INTO users (name, email, password, interests) 
      VALUES (?, ?, ?, ?)
    `;
    await db.query(insertQuery, [name, email, password, interests]);

    // Redirect after successful signup (e.g., to the login page)
    res.redirect("/login");
  } catch (err) {
    console.error("Error in /signup_process:", err);
    res.status(500).send("Error signing up");
  }
});

// Logout route: destroy the session and redirect to home
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error("Error destroying session:", err);
      }
      res.redirect("/");
    });
});

// Start server on port 3000
app.listen(3000, function() {
    console.log(`Server running at http://127.0.0.1:3001/`);
});
