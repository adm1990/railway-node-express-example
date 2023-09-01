import express from 'express'
import { Server as WebSocketServer } from 'socket.io'
import http from 'http'
import cors from 'cors'; // Importa el paquete cors

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new WebSocketServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Access-Control-Allow-Origin"]
  }
});


app.use(express.static(__dirname + '/public'))

io.on('connection', (socket) => {

  console.log('nueva conexion: ', socket.id);
  socket.emit('nuevaConexion');

  // socket.on('pong' ,() => {
  //     console.log('pong recibido del cliente');
  // })

  socket.on('conectarSala', (objetoSocket) => {
    console.log('conectando a sala', objetoSocket)
    socket.join(objetoSocket.idSala);
    io.in(objetoSocket.idSala).emit("usuarioUnidoSala", objetoSocket.nombreUsuario);

  });

  socket.on('abandonarSala', (objetoSocket) => {
    console.log('abandonando la sala', objetoSocket)
    socket.leave(objetoSocket.idSala);
    io.in(objetoSocket.idSala).emit("usuarioAbandonaSala", objetoSocket.nombreUsuario);


  });

  socket.on('irACarrera', (objetoSocket) => {
    console.log('El administrador ha empezado la carrera')
    io.in(objetoSocket.idSala).emit("irACarrera", null);


  });

  socket.on('usuarioListoCarrera', (objetoSocket) => {
    console.log('El usuario está listo')
    io.in(objetoSocket.idSala).emit("usuarioListoCarrera", null);


  });

  socket.on('correr', (objetoSocket) => {
    console.log('El usuario está corriendo')
    io.in(objetoSocket.idSala).emit("corriendo", objetoSocket);

  });

  socket.on('usuarioListo', (objetoSocket) => {
    console.log('El usuario está listo')
    io.in(objetoSocket.idSala).emit("usuarioListo", objetoSocket);

  });


  socket.on('disconnect', () => {
    console.log('usuario desconectado')
  });
})

server.listen(PORT);
console.log(`Tu server está listo en el puerto ${PORT}`);

