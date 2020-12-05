require('dotenv').config()

var createError = require('http-errors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var flash = require('connect-flash');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.AQUA_BOT_PASSWORD));
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.AQUA_BOT_PASSWORD,
  cookie: {
    httpOnly: true,
    secure: false
  }
}))
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  console.log("serializeUser : " + user);
  done(null, user);
})

passport.deserializeUser((user, done) => {
  console.log("deserializeUser : " + user);
  done(null, user);
})

passport.use(new LocalStrategy({
  usernameField: "id",
  passwordField: "password"
}, function(id, password, done) {
    if(id === "aquabot" && password === process.env.AQUA_BOT_PASSWORD){
      var user = {
        id : "aquabot"
      };
      return done(null, user);
    }
    console.log("Incorrect username");
    return done(null, false, { message: 'Incorrect username.' });
  }
));

app.get('/login', function(req, res, next){
  if (req.isAuthenticated()){
    res.send({
      user: req.user
    });
  }
  else{
    res.send({user:""});
  }
});

app.post('/login', function(req, res, next){
  passport.authenticate('local', function(err, user, info) {
    if (err) { 
      return next(err); 
    }

    console.log("/login " + user);
    console.log(info);

    if (!user) { 
      return res.status(401).send("login failed"); 
    }
    
    console.log(user);

    req.logIn(user, function(err) {
      if (err) { 
        return next(err); 
      }
      return res.send(user);
    });
  })(req, res, next);
});

app.get('/login_fail', function(req, res, next){
  res.send("Login is failed");
});

app.use(express.static(path.join(__dirname, 'frontend', 'build')));
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log(err.message);
  
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
