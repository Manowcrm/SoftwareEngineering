const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

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

// Get the functions in the db.js file to use
const db = require('./services/db');

// Create a route for root - /
app.get("/", function(req, res) {
    res.render("index", { title: "Home" });
});

// Create a route for /signup
app.get("/signup", function(req, res) {
    res.render("signup", { title: "Sign Up" });
});

// Create a route for /contact
app.get("/contact", function(req, res) {
    res.render("contact", { title: "Contact" });
});

// Create a route for /features
app.get("/features", function(req, res) {
    res.render("features", { title: "Features" });
});

// Create a route for /how_it_works
app.get("/how_it_works", function(req, res) {
    res.render("how_it_works", { title: "How It Works" });
});

// Create a route for /login
app.get("/login", function(req, res) {
    res.render("login", { title: "Log In" });
});

// Handle login process
app.post("/login_process", function(req, res) {
    const { email, password } = req.body;

    // Dummy user data for demonstration purposes
    const users = [
        { email: "user@example.com", password: "password123" }
    ];

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.send("Welcome back!");
    } else {
        res.render("login", { title: "Log In", error: "Don't recognize credentials, please create an account." });
    }
});

// Start server on port 3000
app.listen(3000, function() {
    console.log(`Server running at http://127.0.0.1:3000/`);
});