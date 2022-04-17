const functions = require("firebase-functions")
const admin = require("firebase-admin")
const { initializeApp } = require('firebase/app')
const { getFirestore, deleteDoc, getDoc, doc, collectionGroup, collection, getDocs, DocumentSnapshot, query, where, setDoc } = require("firebase/firestore");
const { getAuth, signInWithCustomToken, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require("firebase/auth");
const { oauthKeys, config } = require("./info.js")

var express  = require('express')
  , session  = require('express-session')
  , passport = require('passport')
  , Strategy = require('./lib').Strategy
  , app      = express();

const fApp = initializeApp(config)
const db = getFirestore(fApp)
const auth = getAuth(fApp)

app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var scopes = ['identify', 'email', /* 'connections', (it is currently broken) */ 'guilds', 'guilds.join'];
var prompt = 'consent'

passport.use(new Strategy({
    clientID: oauthKeys.clientID,
    clientSecret: oauthKeys.clientSecret,
    callbackURL: 'https://jamsbot.com/callback',
    scope: scopes,
    prompt: prompt
}, function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
        setDoc(doc(db, 'users', profile.id), {
            id: profile.id,
            username: profile.username,
            avatar: profile.avatar,
            discriminator: profile.discriminator,
            banner: profile.banner,
            bannerColor: profile.banner_color,
            accent_color: profile.accent_color,
            locale: profile.locale,
            mfa_enabled: profile.mfa_enabled,
            email: profile.email,
            verified: profile.verified,
            provider: profile.provider,
            token: accessToken,
            guilds: profile.guilds,
            refreshToken: refreshToken
        }).then(() => {
            return done(null, profile);
        })
    });
}));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.get('/login', passport.authenticate('discord', { scope: scopes, prompt: prompt }), async function(req, res) {});
app.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/' }), function(req, res) { res.redirect('/info') } // auth success
);
app.get('/logout', function(req, res) {
    req.logout();
    window.location.replace('https://jamsbot.xyz')
});


app.get('/info', checkAuth, function(req, res) {
    
    getDoc(doc(db, 'users', req.user.id)).then(doc => {
        const user = doc.data()

        signInWithEmailAndPassword(auth, user.email, user.token).then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            console.log('Signed in returning user')
            // ...
        }).catch((error) => {
            if (error.code === 'auth/user-not-found'){
                createUserWithEmailAndPassword(auth, user.email, user.token).then((userCredential) => {
                    // Signed in
                    const user = userCredential.user;
                    console.log('Signed in new user')
                    // ...
                })
            }
        });
    })

    res.json(req.user);
});


function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.send('not logged in :(');
}


app.listen(5000, function (err) {
    if (err) return console.log(err)
    console.log('Listening at http://localhost:5000/')
})

exports.api = functions.https.onRequest(app)