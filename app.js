require("dotenv").config(); // always put on top
const express = require("express");
const bp = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose"); // don't need to require passport-local
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
// const md5 = require("md5");
// const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set('view engine', "ejs");
app.use(bp.urlencoded({extended:true}));

// set up passport session
app.use(session({
    secret: 'Our little secret.', // creates hash for session ID (to prevent session hijacking)
    resave: false,
    saveUninitialized: false,
  }));

  app.use(passport.initialize()); // initialize passport package
  app.use(passport.session()); // use passport to deal with session *check out configure of passport documentations

// connect to mongoDB
mongoose.set('strictQuery', true);
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy()); // authenticate user using username and password

passport.serializeUser(function(user, done){
    done(null, user.id);
}); // create cookie and add user identification info
passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err,user);
    });
}); // crumble cookie to find information inside cookie (authenticate user in server)

// add OAuth for google
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    // googleId from userSchema
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//////////////////////// API ////////////////////////////////
app.get("/", function(req,res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

  app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req,res){
    res.render("login");
});

app.post("/login", function(req,res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.logIn(user, function(err){
        if (err){
            console.log(err);
        } else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })
});

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { 
        return next(err); 
        }
      res.redirect('/');
    });
  });

app.get("/secrets", function(req, res){
    if (req.isAuthenticated()){
      res.render("secrets");
    } else {
      res.redirect("/login");
    };
});

app.get("/register", function(req,res){
    res.render("register");
});

app.post("/register", function(req, res){
    // function from passport-local-mongoose
    User.register({username: req.body.username, active:false}, req.body.password, function(err, user){
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function(){
          // callback triggered if authentication was successful
          // if we managed to successfully set up a cookie that saved their current login session
          res.redirect("/secrets");
        });
      }
    });
});

app.listen(3000,function(){
    console.log("server started on PORT 3000");
});