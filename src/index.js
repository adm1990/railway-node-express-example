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

const listaLobbies = [];
app.use(express.static(__dirname + '/public'))

io.on('connection', (socket) => {

  socket.emit('nuevaConexion');

  socket.on('conectarSala', (objetoSocket) => {
    socket.join(objetoSocket.idSala);
    objetoSocket.usuario.socket = socket.id;

    const existeSala = listaLobbies
      .findIndex(sala => sala.id === objetoSocket.idSala);

    if (existeSala === -1) {
      var objetoSala = {
        id: objetoSocket.idSala,
        usuarios: [objetoSocket.usuario]
      }

      listaLobbies.push(objetoSala)
      io.in(objetoSocket.idSala).emit("usuarioUnidoSala",  objetoSala.usuarios);

    } else {

      var lobbyCarrera = listaLobbies[existeSala]

      const indexUsuario = lobbyCarrera.usuarios
        .findIndex(usuario => usuario.uid === objetoSocket.usuario['uid']);

      if (indexUsuario === -1) {
        listaLobbies[existeSala].usuarios.push(objetoSocket.usuario);
      }
      io.in(objetoSocket.idSala).emit("usuarioUnidoSala",  listaLobbies[existeSala].usuarios);


    }

  });


  socket.on('obtenerLobbyCarrera', (idCarrera) => {
    const existeSala = listaLobbies
      .findIndex(sala => sala.id === idCarrera);

    if (existeSala !== -1) {
      var lobbyCarrera = listaLobbies[existeSala]
    
      io.in(idCarrera).emit("obtenerLobby", lobbyCarrera);

    }


  });



  socket.on('abandonarSala', (objetoSocket) => {

    const existeSala = listaLobbies.find(sala => sala.id === objetoSocket.idSala)
      var lobbyCarrera;
    if (existeSala) {
      const indexUsuario = existeSala.usuarios
        .findIndex(usuario => usuario.uid === objetoSocket.id);
        existeSala.usuarios.splice(indexUsuario, 1); // Elimina el usuario con el uid dado
      socket.leave(objetoSocket.idSala);
      io.in(existeSala.id).emit("usuarioAbandonaSala",existeSala.usuarios);

    } 



  });

  socket.on('irACarrera', (objetoSocket) => {
    io.in(objetoSocket.idSala).emit("irACarrera", null);


  });

  socket.on('usuarioListoCarrera', (objetoSocket) => {
    io.in(objetoSocket.idSala).emit("usuarioListoCarrera", objetoSocket);


  });

  socket.on('correr', (objetoSocket) => {
    const existeSala = listaLobbies
    .findIndex(sala => sala.id === objetoSocket.idSala);
    if (existeSala !== -1) {
      var lobbyCarrera = listaLobbies[existeSala]
      const indexUsuario = lobbyCarrera.usuarios
        .findIndex(usuario => usuario.uid === objetoSocket.idUsuario);

if (indexUsuario !==-1) {
  const usuarioQueHaCorrido = lobbyCarrera.usuarios[indexUsuario]
  usuarioQueHaCorrido.puntuacion = objetoSocket.pasos;
  usuarioQueHaCorrido.localizacion = (usuarioQueHaCorrido.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

  const resultado = {
    usuarioQueHaCorrido:usuarioQueHaCorrido,
    listaUsuarios:lobbyCarrera.usuarios

  }
  io.in(objetoSocket.idSala).emit("corriendo", resultado);

}

 

    }



  });

  socket.on('usuarioListo', (objetoSocket) => {
    const existeSala = listaLobbies
      .findIndex(sala => sala.id === objetoSocket.idSala);

    if (existeSala !== -1) {
      var lobbyCarrera = listaLobbies[existeSala]
      const indexUsuario = lobbyCarrera.usuarios
        .findIndex(usuario => usuario.uid === objetoSocket.usuario.uid);

      if (indexUsuario !== -1) {
        lobbyCarrera.usuarios[indexUsuario] =objetoSocket.usuario;
  
        io.in(objetoSocket.idSala).emit("usuarioListo", lobbyCarrera.usuarios);

      }
    }







  });

  socket.on('lanzarObjeto', (objetoSocket) => {

    const existeSala = listaLobbies
    .findIndex(sala => sala.id === objetoSocket.idSala);
    if (existeSala !== -1) {
      var usuariosCarrera = listaLobbies[existeSala].usuarios
      usuariosCarrera.sort((a, b) => b.puntuacion - a.puntuacion);
      const posicionUsuario = usuariosCarrera.findIndex(usuario => usuario.uid === objetoSocket['idUsuario']);
      const usuarioDelanteDeMi = usuariosCarrera[posicionUsuario - 1]
      const primerUsuario = usuariosCarrera[0]
      const miUsuario = usuariosCarrera.find(usuario => usuario.uid === objetoSocket['idUsuario']);
      const misItems = miUsuario.objetosEquipados
      const itemLanzado = misItems.findIndex(item => item.id === objetoSocket['idItem']);


      if (usuarioDelanteDeMi) {
        misItems.splice(itemLanzado, 1); // Elimina el usuario con el uid dado

        var usuarioObjetivoTieneEscudo = usuarioDelanteDeMi.objetosEquipados?.findIndex(item => item.id === 7);
  
        if (objetoSocket['idItem'] === 6) {
           usuarioObjetivoTieneEscudo = primerUsuario.objetosEquipados?.findIndex(item => item.id === 7);
        }




        if ((usuarioObjetivoTieneEscudo === -1 || usuarioObjetivoTieneEscudo === undefined)  ) {
          if (objetoSocket['impacto']) {
  
            if (objetoSocket['idItem'] !== 1) { // 1 es el potenciador que va por otro lado.
              usuarioDelanteDeMi.puntuacion -= objetoSocket['impacto']
              usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

            }
       
  
          } else {
  
            if (objetoSocket['idItem'] === 2) {

              const puntuacionRival = usuarioDelanteDeMi.puntuacion;
              const miPuntuacion = miUsuario.puntuacion;
              usuarioDelanteDeMi.puntuacion = miPuntuacion;
              miUsuario.puntuacion = puntuacionRival;
              miUsuario.localizacion = (miUsuario.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);
              usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

            } else if (objetoSocket['idItem'] === 3){
              usuarioDelanteDeMi.puntuacion = 0;
              usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

            }
            else if (objetoSocket['idItem'] === 4){
              usuarioDelanteDeMi.puntuacion =  miUsuario.puntuacion -1;
              usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

            }
            else if (objetoSocket['idItem'] === 5){
             miUsuario.puntuacion = usuarioDelanteDeMi.puntuacion +1
             miUsuario.localizacion = (miUsuario.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

  
            }
            else if (objetoSocket['idItem'] === 6){

       
                miUsuario.puntuacion = primerUsuario.puntuacion +1;
                miUsuario.localizacion = (miUsuario.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

             }
  
          }
        } else {



          if (objetoSocket['idItem'] === 6) {
            primerUsuario.objetosEquipados.splice(usuarioObjetivoTieneEscudo, 1); 
         } else {
if ( objetoSocket['idItem'] !== 1) {
  usuarioDelanteDeMi.objetosEquipados.splice(usuarioObjetivoTieneEscudo, 1); 

}


         }

        }


    



      } 

      if (objetoSocket['idItem'] === 1) {
        misItems.splice(itemLanzado, 1); // Elimina el usuario con el uid dado
        miUsuario.puntuacion += objetoSocket['impacto']
        miUsuario.localizacion = (miUsuario.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);
      }
    
      const objetoRespuesta = {
        usuarios: usuariosCarrera,
        idUsuario:objetoSocket['idUsuario'],
        itemCantidad:objetoSocket['itemCantidad'],
        itemNombre:objetoSocket['itemNombre'],
      }
      
      io.in(objetoSocket.idSala).emit("lanzarObjeto", objetoRespuesta);




    }








  });


  socket.on('expulsarUsuario', (objetoSocket) => {
       io.in(objetoSocket.idSala).emit("detectarExpulsion",objetoSocket);

  });



  socket.on('eliminarCarrera', (objetoSocket) => {
    const existeSala = listaLobbies.findIndex(sala => sala.id === objetoSocket)
    listaLobbies.splice(existeSala, 1); // Elimina el usuario con el uid dado

  });


  socket.on('anfitrionEliminaSala', (objetoSocket) => {
    io.in(objetoSocket).emit("avisoEliminarSala",objetoSocket);


  });

  socket.on('disconnect', () => {
  });
})

server.listen(PORT);

