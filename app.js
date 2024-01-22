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
    },
});

var rooms = {
    'blackjack': []
};
var wsIds = [];

function getRandomInt(min, max, avoidIndexArray) {
    min = Math.ceil(min);
    max = Math.floor(max);
    let returnValue = Math.floor(Math.random() * (max - min)) + min;
    avoidIndexArray.map((index) => {
        if (index === returnValue)
            returnValue = getRandomInt(min, max, avoidIndexArray);
    });
    return returnValue;
}
function sendBroadCast(type) {
    io.sockets.sockets.forEach(function each(client) {
        client.emit('message', JSON.stringify({
            type: type, 
            instruction: 'show_room',
            rooms: rooms[type],
            id: client.id,
        }))
    })
}
function sendData(wsId, data) {
    io.sockets.sockets.forEach(function each(client) {
        if (client.id === wsId) {
            console.log(client.id);
            data.id = client.id;
            client.emit('message', JSON.stringify(data));
            return;
        }
    })
}

function blackjack(ws, receivedData) {
    let room;
    let playerCardIndexes1 = [], playerCardIndexes2 = [], dealerCardIndexes = [];
    switch(receivedData.instruction) {
        case 'fetch_room':
            sendBroadCast('blackjack');
            break;
        case 'create_room':
            rooms['blackjack'].push({
                id: ws.id,
                name: receivedData.name,
                connectedPlayers: [{id: ws.id, playerType: 'Dealer'}]
            });
            sendData(ws.id, {
                type: 'blackjack',
                instruction: 'create_room',
                id: ws.id
            });
            sendBroadCast('blackjack');
            break;
        case 'join_room':
            room = rooms['blackjack'].find((room) => room.id === receivedData.roomId);
            room.connectedPlayers.push({id: ws.id, playerType: 'Player'});
            sendBroadCast('blackjack');
            setTimeout(() => {
                if (room.connectedPlayers.length === 2) {
                    room.connectedPlayers.map((player) => {
                        sendData(player.id, {
                            type: 'blackjack',
                            instruction: 'start_room',
                            roomId: room.id,
                            player: player,
                        })
                    })
                }
            }, 5000);
            break;
        case 'deal_ended':
            room = rooms['blackjack'].find((room) => room.id === receivedData.roomId);
            playerCardIndexes1.push(getRandomInt(0, 51, []));
            playerCardIndexes1.push(getRandomInt(0, 51, playerCardIndexes1));
            dealerCardIndexes.push(getRandomInt(0, 51, playerCardIndexes1));
            dealerCardIndexes.push(getRandomInt(0, 51, dealerCardIndexes.concat(playerCardIndexes1).concat(playerCardIndexes2)));

            console.log(room.connectedPlayers);
            room.connectedPlayers.map((player) => {
                sendData(player.id, {
                    type: 'blackjack',
                    instruction: 'deal_ended',
                    roomId: room.id,
                    dealedChipTypes: receivedData.dealedChipTypes,
                    dealedTotalAmount: receivedData.dealedTotalAmount,
                    playerCardIndexes1: playerCardIndexes1,
                    playerCardIndexes2: playerCardIndexes2,
                    dealerCardIndexes: dealerCardIndexes,
                })
            })
            break;
        case 'hit':
            room = rooms['blackjack'].find((room) => room.id === receivedData.roomId);
            dealerCardIndexes = receivedData.dealerCardIndexes;
            playerCardIndexes1 = receivedData.playerCardIndexes1;
            playerCardIndexes2 = receivedData.playerCardIndexes2;
            room.connectedPlayers.map((player) => {
                if (player.id === receivedData.playerId) {
                    console.log(player.playerType);
                    if (player.playerType === "Dealer") dealerCardIndexes.push(getRandomInt(0, 51, dealerCardIndexes.concat(playerCardIndexes1).concat(playerCardIndexes2)));
                    else if (player.playerType === "Player") {
                        if (receivedData.playerCardsIndex === 1) playerCardIndexes1.push(getRandomInt(0, 51, dealerCardIndexes.concat(playerCardIndexes1).concat(playerCardIndexes2)));
                        else if (receivedData.playerCardsIndex === 2) playerCardIndexes2.push(getRandomInt(0, 51, dealerCardIndexes.concat(playerCardIndexes1).concat(playerCardIndexes2)));
                    }
                }
            });
            room.connectedPlayers.map((player) => {
                sendData(player.id, {
                    type: 'blackjack',
                    instruction: 'hit',
                    roomId: room.id,
                    player: player,
                    playerCardIndexes1: playerCardIndexes1,
                    playerCardIndexes2: playerCardIndexes2,
                    dealerCardIndexes: dealerCardIndexes,
                })
            })
            break;
        case 'stand':
            room = rooms['blackjack'].find((room) => room.id === receivedData.roomId);
            dealerCardIndexes = receivedData.dealerCardIndexes;
            playerCardIndexes1 = receivedData.playerCardIndexes1;
            playerCardIndexes2 = receivedData.playerCardIndexes2;
            room.connectedPlayers.map((player) => {
                sendData(player.id, {
                    type: 'blackjack',
                    instruction: 'stand',
                    roomId: room.id,
                    player: player,
                    playerCardIndexes1: playerCardIndexes1,
                    playerCardIndexes2: playerCardIndexes2,
                    dealerCardIndexes: dealerCardIndexes,
                    playerCardsIndex: receivedData.playerCardsIndex
                })
            })
            break;
        case 'insure':
            room = rooms['blackjack'].find((room) => room.id === receivedData.roomId);
            dealerCardIndexes = receivedData.dealerCardIndexes;
            playerCardIndexes1 = receivedData.playerCardIndexes1;
            playerCardIndexes2 = receivedData.playerCardIndexes2;
            room.connectedPlayers.map((player) => {
                sendData(player.id, {
                    type: 'blackjack',
                    instruction: 'insure',
                    roomId: room.id, 
                    player: player,
                    playerCardIndexes1: playerCardIndexes1,
                    playerCardIndexes2: playerCardIndexes2,
                    dealerCardIndexes: dealerCardIndexes,
                })
            })
            break;
        case 'split':
            room = rooms['blackjack'].find((room) => room.id === receivedData.roomId);
            dealerCardIndexes = receivedData.dealerCardIndexes;
            playerCardIndexes1 = receivedData.playerCardIndexes1;
            playerCardIndexes2 = receivedData.playerCardIndexes2;
            playerCardIndexes2.push(playerCardIndexes1[1]);
            playerCardIndexes1.pop();
            room.connectedPlayers.map((player) => {
                sendData(player.id, {
                    type: 'blackjack',
                    instruction: 'split',
                    roomId: room.id,
                    player: player,
                    playerCardIndexes1: playerCardIndexes1,
                    playerCardIndexes2: playerCardIndexes2,
                    dealerCardIndexes: dealerCardIndexes,
                })
            })

    }
}

function baccarat(ws, receivedData) {
    let playerCardIndexes = [], bankerCardIndexes = [];
    switch (receivedData.instruction) {
        case 'start_game':
            setTimeout(() => {
                sendData(ws.id, {
                    type: 'baccarat',
                    instruction: 'start_game',
                    playerId: ws.id,
                });
            }, 5000);
            break;
        case 'deal_ended':
            playerCardIndexes.push(getRandomInt(0, 51, []));
            bankerCardIndexes.push(getRandomInt(0, 51, playerCardIndexes));
            playerCardIndexes.push(getRandomInt(0, 51, playerCardIndexes.concat(bankerCardIndexes)));
            bankerCardIndexes.push(getRandomInt(0, 51, playerCardIndexes.concat(bankerCardIndexes)));
            sendData(ws.id, {
                type: 'baccarat',
                instruction: 'deal_ended',
                playerId: receivedData.playerId,
                playerCardIndexes: playerCardIndexes,
                bankerCardIndexes: bankerCardIndexes,

            })
            break;
        case 'player_thirdcard':
            playerCardIndexes = receivedData.playerCardIndexes;
            bankerCardIndexes = receivedData.bankerCardIndexes;
            playerCardIndexes.push(getRandomInt(0, 51, playerCardIndexes.concat(bankerCardIndexes)));
            sendData(ws.id, {
                type: 'baccarat',
                instruction: 'player_thirdcard',
                playerId: receivedData.playerId,
                playerCardIndexes: playerCardIndexes,
                bankerCardIndexes: bankerCardIndexes,
            })
            break;
        case 'banker_thirdcard':
            playerCardIndexes = receivedData.playerCardIndexes;
            bankerCardIndexes = receivedData.bankerCardIndexes;
            bankerCardIndexes.push(getRandomInt(0, 51, playerCardIndexes.concat(bankerCardIndexes)));
            sendData(ws.id, {
                type: 'baccarat',
                instruction: 'banker_thirdcard',
                playerId: receivedData.playerId,
                playerCardIndexes: playerCardIndexes,
                bankerCardIndexes: bankerCardIndexes,
            })
            break;
    }
}

function roulette(ws, receivedData) {
    switch (receivedData.instruction) {
        case 'start_game':
            setTimeout(() => {
                sendData(ws.id, {
                    type: 'roulette',
                    instruction: 'start_game',
                    playerId: ws.id,
                });
            }, 5000);
            break;
    }
}

function paigow(ws, receivedData) {
    switch (receivedData.instruction) {
        case 'start_game':
            setTimeout(() => {
                sendData(ws.id, {
                    type: 'paigow',
                    instruction: 'start_game',
                    playerId: ws.id,
                });
            }, 5000);
            break;
    }
}

function letitride(ws, receivedData) {
    switch (receivedData.instruction) {
        case 'start_game':
            setTimeout(() => {
                sendData(ws.id, {
                    type: 'letitride',
                    instruction: 'start_game',
                    playerId: ws.id,
                });
            }, 5000);
            break;
    }
}

function threecardpoker(ws, receivedData) {
    switch (receivedData.instruction) {
        case 'start_game':
            setTimeout(() => {
                sendData(ws.id, {
                    type: 'threecardpoker',
                    instruction: 'start_game',
                    playerId: ws.id,
                });
            }, 5000);
            break;
    }
}

function ultimatetexasholdem(ws, receivedData) {
    switch (receivedData.instruction) {
        case 'start_game':
            setTimeout(() => {
                sendData(ws.id, {
                    type: 'ultimatetexasholdem',
                    instruction: 'start_game',
                    playerId: ws.id,
                });
            }, 5000);
            break;
    }
}

function start() {
    io.on('connection', (socket) => {
        wsIds.push(socket.id);
        sendBroadCast('blackjack');
        socket.on('message', (messageAsString) => {
            console.log(messageAsString);
            let receivedData = JSON.parse(messageAsString);
            switch (receivedData.type) {
                case 'blackjack':
                    blackjack(socket, receivedData);
                    break;
                case 'baccarat':
                    baccarat(socket, receivedData);
                    break;
                case 'roulette':
                    roulette(socket, receivedData);
                    break;
                case 'paigow':
                    paigow(socket, receivedData);
                    break;
                case 'letitride':
                    letitride(socket, receivedData);
                    break;
                case 'threecardpoker':
                    threecardpoker(socket, receivedData);
                    break;
                case 'ultimatetexasholdem':
                    ultimatetexasholdem(socket, receivedData);
                    break;
            }
        })
        socket.on('close', () => {
            let roomIndex = rooms['blackjack'].findIndex((room) => room.id === socket.id);
            let wsIdIndex = wsIds.findIndex((id) => id === socket.id);
            rooms['blackjack'].splice(roomIndex, 1);
            wsIds.splice(wsIdIndex, 1);
            socket.close();
            sendBroadCast('blackjack');
        })
    })
}

server.listen(4000, () => {
    console.log("server is running on port 4000");
    start();
})