require("dotenv").config(); // always put on top
const express = require("express");
const bp = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set('view engine', "ejs");
app.use(bp.urlencoded({extended:true}));

mongoose.set('strictQuery', true);
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

app.get("/", function(req,res){
    res.render("home");
});

app.get("/login", function(req,res){
    res.render("login");
});

app.post("/login", function(req,res){
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email:username}, function(err, foundUser){
        if (err){
            console.log(err);
        } else {
            if (foundUser) {
                if (foundUser.password == password) {
                    res.render("secrets");
                }
            }
        }
    })
})

app.get("/register", function(req,res){
    res.render("register");
});

app.post("/register", function(req,res){
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save(function(err){
        if (err){
            console.log(err);
        } else {
            res.render("secrets");
        }
    });

});

app.listen(3000,function(){
    console.log("server started on PORT 3000");
});