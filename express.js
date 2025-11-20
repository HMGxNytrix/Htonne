// express.js
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const fetch = require('node-fetch');
const app = express();
const PORT = 3000;

// Discord OAuth2
const CLIENT_ID = 'TWÓJ_CLIENT_ID';
const CLIENT_SECRET = 'TWÓJ_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/callback';
const BOT_TOKEN = 'TWÓJ_BOT_TOKEN';

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.use(session({ secret: 'secretkey', resave: false, saveUninitialized: false }));

// Strony statyczne
app.get('/', (req, res) => res.render('index', { title: 'Strona główna', user: req.session.user }));
app.get('/regulamin', (req, res) => res.render('regulamin', { title: 'Regulamin', user: req.session.user }));
app.get('/polityka', (req, res) => res.render('polityka', { title: 'Polityka prywatności', user: req.session.user }));
app.get('/admini', (req, res) => {
    const admins = [{name:'Admin1',role:'Owner'},{name:'Admin2',role:'Moderator'}];
    res.render('admini', { title: 'Administratorzy', admins, user: req.session.user });
});

// OAuth2 Discord
app.get('/login', (req, res) => {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify guilds`;
    res.redirect(url);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('grant_type','authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);
    params.append('scope','identify guilds');

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', { method:'POST', body:params, headers:{'Content-Type':'application/x-www-form-urlencoded'} });
    const tokenJson = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', { headers:{'Authorization':`Bearer ${tokenJson.access_token}`} });
    const userJson = await userRes.json();
    req.session.user = userJson;
    req.session.access_token = tokenJson.access_token;
    res.redirect('/panel');
});

// Panel admina
app.get('/panel', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    // Lista serwerów dla użytkownika
    const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', { headers:{'Authorization':`Bearer ${req.session.access_token}`} });
    const guilds = await guildsRes.json().catch(()=>[]);
    res.render('panel', { title:'Panel Zarządzania', user:req.session.user, guilds });
});

// Kick / ban przykład
app.get('/kick/:guildId/:userId', async (req,res)=>{
    const {guildId,userId} = req.params;
    await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, { method:'DELETE', headers:{'Authorization':`Bot ${BOT_TOKEN}`} });
    res.redirect('/panel');
});

app.listen(PORT, ()=>console.log(`Serwer działa na http://localhost:3000`));
