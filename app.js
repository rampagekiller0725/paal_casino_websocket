const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
        credentials: true,
        methods: ['GET', "POST"],
    },
});
// io?.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')

var cnt = 0;

app.get('/test', (req, res) => {
    res.send({ status: 200, data: 'success' });
})

io.on('connection', (socket) => {
    console.log('connected');
    // console.log(io.sockets.sockets)
    io.sockets.sockets.forEach(function each(client) {
        console.log(client.id);
    })
    socket.on('first', (data) => {
        cnt++;
        socket.emit('second', cnt);
    })
})

server.listen(4000, () => {
    console.log("server is running on port 4000");
})