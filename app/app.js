const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const http = require("http");
const socketIo = require("socket.io");

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
app.use(express.json()); // <-- This middleware parses JSON payloads

// Set up sessions
app.use(session({
  secret: 'supersecretkey',  // replace with a secure secret in production
  resave: false,
  saveUninitialized: false
}));

// Get the functions in the db.js file to use
const db = require('./services/db');

// Routes
app.get("/", function(req, res) {
    res.render("index", { title: "Home", user: req.session.user });
});

app.get("/signup", function(req, res) {
    res.render("signup", { title: "Sign Up", user: req.session.user });
});

app.get("/contact", function(req, res) {
    res.render("contact", { title: "Contact", user: req.session.user });
});

app.get("/features", function(req, res) {
    res.render("features", { title: "Features", user: req.session.user });
});

app.get("/how_it_works", function(req, res) {
    res.render("how_it_works", { title: "How It Works", user: req.session.user });
});

app.get("/login", function(req, res) {
    res.render("login", { title: "Log In", user: req.session.user });
});

// GET route to render the settings page
app.get("/settings", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("settings", { title: "Settings", user: req.session.user });
});

// POST route to update settings
app.post("/settings_update", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const { emailNotifications, theme, privacy } = req.body;
  try {
    await db.query(
      "UPDATE users SET emailNotifications = ?, theme = ?, privacy = ? WHERE id = ?",
      [emailNotifications, theme, privacy, req.session.user.id]
    );
    // Update session object with new settings
    req.session.user.emailNotifications = emailNotifications;
    req.session.user.theme = theme;
    req.session.user.privacy = privacy;
    res.redirect("/settings");
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).send("Error updating settings");
  }
});

// Optional: POST route for account deletion
app.post("/delete_account", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  try {
    await db.query("DELETE FROM users WHERE id = ?", [req.session.user.id]);
    req.session.destroy();
    res.redirect("/signup"); // Or homepage
  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).send("Error deleting account");
  }
});

// Chat route
app.get("/chats", (req, res) => {
  if(!req.session.user) {
      return res.redirect("/login");
  }
  res.render("chats", { title: "Chats", user: req.session.user });
});

app.get("/chats", (req, res) => {
  // Ensure the user is logged in; if not, redirect to the login page.
  if (!req.session.user) {
    return res.redirect("/login");
  }
  // Render the chats view and pass the user data.
  res.render("chats", { title: "Chats", user: req.session.user });
});

app.get("/profile", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("profile", { title: "Profile", user: req.session.user });
});

app.post("/profile_update", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  try {
    const { username, name, email, password, interests } = req.body;
    // If you haven't added a "username" column, you may update just name, email, password, and interests.
    await db.query(
      "UPDATE users SET username = ?, name = ?, email = ?, password = ?, interests = ? WHERE id = ?",
      [username, name, email, password, interests, req.session.user.id]
    );
    // Update session data with the new information
    req.session.user = { ...req.session.user, username, name, email, interests };
    res.redirect("/profile");
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).send("Error updating profile");
  }
});

app.post("/profile_update", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  try {
    const { name, email, password, interests } = req.body;
    // For username, you can use name if you don't have a separate username field.
    await db.query(
      "UPDATE users SET name = ?, email = ?, password = ?, interests = ? WHERE id = ?",
      [name, email, password, interests, req.session.user.id]
    );
    // Update session data (excluding password for security)
    req.session.user = { ...req.session.user, name, email, interests };
    res.redirect("/profile");
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).send("Error updating profile");
  }
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
    const { name, email, password, interests } = req.body;
    const insertQuery = `
      INSERT INTO users (name, email, password, interests) 
      VALUES (?, ?, ?, ?)
    `;
    await db.query(insertQuery, [name, email, password, interests]);
    res.redirect("/login");
  } catch (err) {
    console.error("Error in /signup_process:", err);
    res.status(500).send("Error signing up");
  }
});

app.get("/find_buddy", (req, res) => {
  if (!req.session.user) { 
    return res.redirect("/login"); 
  }
  res.render("find_buddy", { title: "Find Your Buddy", user: req.session.user });
});

// Find buddy endpoint
app.get("/find_buddy/:module", async (req, res) => {
  const { module } = req.params;
  try {
    const buddies = await db.query(
      "SELECT id, name, email FROM users WHERE FIND_IN_SET(?, interests)",
      [module]
    );
    res.json(buddies);
  } catch (error) {
    console.error("Error retrieving buddy list:", error);
    res.status(500).json({ error: "Error retrieving buddy list" });
  }
});

// Add buddy endpoint
app.post("/add_buddy", async (req, res) => {
  const { currentUserId, buddyId } = req.body;
  try {
    await db.query(
      "INSERT INTO buddies (user_id, buddy_id) VALUES (?, ?)",
      [currentUserId, buddyId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error adding buddy:", error);
    res.status(500).json({ error: "Error adding buddy" });
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

app.get("/get_buddies", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    // Assuming buddies table stores user_id (the current user) and buddy_id (the buddy)
    const buddies = await db.query(
      "SELECT u.id, u.name, u.email FROM buddies b JOIN users u ON b.buddy_id = u.id WHERE b.user_id = ?",
      [req.session.user.id]
    );
    res.json(buddies);
  } catch (error) {
    console.error("Error retrieving buddy list for dashboard:", error);
    res.status(500).json({ error: "Error retrieving buddy list" });
  }
});

// -------------------------------
// Socket.io Messaging Integration
// -------------------------------
const server = http.createServer(app);
const io = socketIo(server);

io.on("connection", (socket) => {
  console.log("New client connected");

  // Listen for chat messages
  socket.on("chatMessage", (msg) => {
    console.log("Message received:", msg);
    // Here, you could also save the message to your database if needed

    // Broadcast the message to all connected clients
    io.emit("chatMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Start server using the HTTP server (not app.listen)
server.listen(3000, function() {
    console.log("Server running on port 3000");
});