# Notes while creating website

res.render() will render the view with data passed to it, </br>
res.redirect() will redirect a user to another page (at which point the request starts over) </br>

set up server
```javascript
const app = express();
```

serve static files in public folder </br>
set ejs as view enginer </br>
==bp.urlencoded({extended:true})== meaning: </br>

<p>Returns middleware that only parses {urlencoded} bodies and only looks at requests where the Content-Type header matches the type option. This parser accepts only UTF-8 encoding of the body and supports automatic inflation of gzip and deflate encodings.

A new body object containing the parsed data is populated on the request object after the middleware (i.e. req.body). This object will contain key-value pairs, where the value can be a string or array (when extended is false), or any type (when extended is true).</p>
```javascript
app.use(express.static("public"));
app.set('view engine', "ejs");
app.use(bp.urlencoded({extended:true}));
```

connect to db using mongodb </br>
```javascript
mongoose.set('strictQuery', true);
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});
```

## Level 1 Security: Register User with username and password

```javascript
app.post("/register", function(req, res){
  // create new user 
  const newUser =  new User({
    email: req.body.username,
    password: req.body.password
  });
  // save new user
  newUser.save(function(err){
    if (err) {
      console.log(err);
    } else {
      // if no error go to secrets page (only accessed by user)
      res.render("secrets");
    }
  });
});

app.post("/login", function(req, res){
  const username = req.body.username;
  const password = req.body.password;
  // find user in db
  User.findOne({email: username}, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        // if username matches match for password
        if (foundUser.password === password) {
          // render to secrets page
          res.render("secrets");
        }
      }
    }
  });
});
```

## Level 2 Security: Database Encryption

set schema to mongoose schema </br>
```javascript
const userSchema = new mongoose.Schema ({
  email: String,
  password: String
});
```

add mongoose encryption </br>
```javascript
const secret = "Thisisourlittlesecret.";
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });
```

## Level 3 Security: Hashing Passwords

use md5 to hash passwords</br>
hashing is a one-way function to create irreversible passwords</br>

```javascript
app.post("/register", function(req, res){
  const newUser =  new User({
    email: req.body.username,
    password: md5(req.body.password) //md5 to hash password
  });
  newUser.save(function(err){
    if (err) { 
    ...
    }
  });
});

app.post("/login", function(req, res){
  const username = req.body.username;
  const password = md5(req.body.password); // hash password to compare

  User.findOne({email: username}, function(err, foundUser){
    if (err) {
        ...
    }
  });
});
```

## Level 4 Security: Salting and hashing passwords with bcrypt

use bcrypt to add extra security using salting </br>
password + salt1 -> hash + salt2 -> hash + salt3 .... -> final hash </br>
- produce different hashes for same password string
```javascript
const bcrypt = require("bcrypt");
const saltRounds = 10;
```
</br>

```javascript
app.post("/register", function(req, res){
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    const newUser =  new User({
      email: req.body.username,
      password: hash // use bcrypt hash as password
    });
    newUser.save(function(err){
      if (err) {
        console.log(err);
      } else {
        res.render("secrets");
      }
    });
  });
});


app.post("/login", function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        // user bcrypt compare to hash password and compare to password in db
        // returns bool value
        bcrypt.compare(password, foundUser.password, function(err, result) {
          if (result === true) {
            res.render("secrets");
          }
        });
      }
    }
  });
});
```
## Level 5 Security: Use Passport.js to add cookie and session
 npm i passport passport-local passport-local-mongoose express-session </br>
 allows user to maintain login status until browser ends </br>

```javascript
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
// don't need passport-local bc it is a requirement of passport-local-mongoose
```

set up passport session and initialize
```javascript
app.use(session({
    secret: 'Our little secret.', // creates hash for session ID (to prevent session hijacking)
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true }
  }));

  app.use(passport.initialize()); // initialize passport package
  app.use(passport.session()); // use passport to deal with session *check out configure of passport documentations
```

add passport-local-mongoose plugin </br>
```javascript
userSchema.plugin(passportLocalMongoose);
```

authenticate user using cookies</br>
```javascript
passport.use(User.createStrategy()); // authenticate user using username and password

passport.serializeUser(User.serializeUser()); // create cookie and add user identification info
passport.deserializeUser(User.deserializeUser()); // crumble cookie to find information inside cookie (authenticate user in server)

```

## Level 6 Security: OAuth2.0 and implement sign in using Google