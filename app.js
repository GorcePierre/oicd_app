require('custom-env').env('google');

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var passport = require('passport');
var OidcStrategy = require('passport-openidconnect').Strategy;
var index = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use('oidc', new OidcStrategy({
  issuer: process.env.ISSUER,
  authorizationURL: process.env.AUTHORIZATION_URL,
  tokenURL: process.env.TOKEN_URL,
  userInfoURL: process.env.USER_INFO_URL,
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  scope: 'openid profile',

  // This is defined at the IdP website
  // This allows you to access more info in the `req` parameter
  callbackURL: process.env.BASE_URL + process.env.CALLBACK_ENDPOINT,
  passReqToCallback: true // This also allows you to access more info in the `req` parameter
}, (req, issuer, sub, profile, accessToken, refreshToken, params, done) => {
	// console.log(params); // Access access_token and id_token with params
	req.session.id_token = params.id_token;
	req.session.access_token = params.access_token;
	return done(null, profile);
}));

passport.serializeUser((user, next) => {
  next(null, user);
});

passport.deserializeUser((obj, next) => {
  next(null, obj);
});

// This function makes sure you're logged in
function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login')
}

app.use('/', index);

app.use('/login', passport.authenticate('oidc', {
	successReturnToOrRedirect: "/",
  	scope: 'email profile'
}));

// This is the callback route defined at your IdP
app.use(process.env.CALLBACK_ENDPOINT,
  passport.authenticate('oidc', {
	callback: true,
	successReturnToOrRedirect: '/profile',
  	failureRedirect: '/error'
  }),
  (req, res) => {
    res.redirect('/');
  }
);

app.use('/profile', ensureLoggedIn, (req, res) => {

	// // If you want the `id_token` decoded
	// function parseJwt (token) {
	// 	var base64Url = token.split('.')[1];
	// 	var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	// 	return JSON.parse(Buffer.from(base64, 'base64').toString());
	// };
	// var decoded = parseJwt(req.session.id_token);
	// console.log(decoded);

  res.render('profile', {
  	title: 'Express',
  	user: req.user,
  	access_token: req.session.access_token,
  	id_token: req.session.id_token,
  });
});

// // Destroy both the local session and
// // revoke the access_token at the IdP
// app.get('/logout', (req, res) => {
//   request.post(process.env.REVOCATION_ENDPOINT, {
//     'form':{
//       'client_id': process.env.CLIENT_ID,
//       'client_secret': process.env.CLIENT_SECRET,
//       'token': req.session.accessToken,
//       'token_type_hint': 'access_token'
//     }
//   },
//   (err, respose, body) => {
//     console.log('Session Revoked');
//     res.redirect('/');
//   });
// });

app.get('/logout', (req, res) => {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

module.exports = app;
