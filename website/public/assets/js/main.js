import { app } from "./app.js";

// File name stuff
const filePath = window.location.pathname;
const fileExtension = filePath.split("/").pop();
const pageName = fileExtension.split('.')[0]

if (pageName == 'invite') {
    window.location.replace('https://discord.com/api/oauth2/authorize?client_id=935801319569104948&permissions=412337163328&scope=bot%20applications.commands')
}

if (pageName == 'support') {
    window.location.replace('https://discord.gg/nushMv6R8T')
}