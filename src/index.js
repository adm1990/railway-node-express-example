import express from 'express'
import {Server as WebSocketServer} from 'socket.io'
import http from 'http'

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new WebSocketServer(server)


app.use(express.static(__dirname + '/public'))

io.on('connection', (socket) => {

console.log('nueva conexion: ',socket.id);



})

server.listen(PORT);
console.log(`Tu server está listo en el puerto ${PORT}`);	

