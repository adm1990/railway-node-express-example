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
    objetoSocket.usuario.socket = socket.id;

    const existeSala = listaLobbies
      .findIndex(sala => sala.id === objetoSocket.idSala);

    if (existeSala === -1) {
      socket.join(objetoSocket.idSala);

      var objetoSala = {
        id: objetoSocket.idSala,
        usuarios: [objetoSocket.usuario]
      }

      listaLobbies.push(objetoSala)
      io.in(objetoSocket.idSala).emit("usuarioUnidoSala", objetoSala.usuarios);

    } else {

      var lobbyCarrera = listaLobbies[existeSala]

      const indexUsuario = lobbyCarrera.usuarios
        .findIndex(usuario => usuario.uid === objetoSocket.usuario['uid']);

      if (indexUsuario === -1) {
        listaLobbies[existeSala].usuarios.push(objetoSocket.usuario);
      }


      if ( listaLobbies[existeSala].usuarios.length <= objetoSocket.jugadores) {
        console.log('A');
        socket.join(objetoSocket.idSala);
        io.in(objetoSocket.idSala).emit("usuarioUnidoSala", listaLobbies[existeSala].usuarios);

      } else {
        console.log('B');
        socket.emit("usuarioUnidoSala", "lleno");

      }



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



  socket.on('eliminarSala', (objetoSocket) => {
    try {
      const existeSalaIndex = listaLobbies.findIndex(sala => sala.id === objetoSocket);

      if (existeSalaIndex !== -1) {
          listaLobbies.splice(existeSalaIndex, 1); 
        io.in(objetoSocket).emit("salaEliminada", true);
  
      }
    } catch (error) {
      
    }
  



  });


  socket.on('abandonarSala', (objetoSocket) => {
    try {
      const existeSala = listaLobbies.find(sala => sala.id === objetoSocket.idSala)
      const existeSalaIndex = listaLobbies.findIndex(sala => sala.id === objetoSocket.idSala);
  
      var lobbyCarrera;
      if (existeSala) {
        const indexUsuario = existeSala.usuarios
          .findIndex(usuario => usuario.uid === objetoSocket.id);
        existeSala.usuarios.splice(indexUsuario, 1); // Elimina el usuario con el uid dado
        socket.leave(objetoSocket.idSala);
  
        io.in(existeSala.id).emit("usuarioAbandonaSala", existeSala.usuarios);
  
      }
  
    } catch (error) {
      
    }



  });

  socket.on('irACarrera', (objetoSocket) => {
    io.in(objetoSocket.idSala).emit("irACarrera", null);


  });

  socket.on('usuarioListoCarrera', (objetoSocket) => {
    io.in(objetoSocket.idSala).emit("usuarioListoCarrera", objetoSocket);


  });

  socket.on('correr', (objetoSocket) => {
    try {
      
    const existeSala = listaLobbies
    .findIndex(sala => sala.id === objetoSocket.idSala);
  if (existeSala !== -1) {
    var lobbyCarrera = listaLobbies[existeSala]
    const indexUsuario = lobbyCarrera.usuarios
      .findIndex(usuario => usuario.uid === objetoSocket.idUsuario);

    if (indexUsuario !== -1) {
      const usuarioQueHaCorrido = lobbyCarrera.usuarios[indexUsuario]
      usuarioQueHaCorrido.puntuacion = objetoSocket.pasos;

      // usuarioQueHaCorrido.localizacion = (usuarioQueHaCorrido.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - objetoSocket['altoJugador']);
      // console.log('llegamos');
      const resultado = {
        usuarioQueHaCorrido: usuarioQueHaCorrido,
        listaUsuarios: lobbyCarrera.usuarios

      }
      io.in(objetoSocket.idSala).emit("corriendo", resultado);

    }



  }

    } catch (error) {
      
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
        lobbyCarrera.usuarios[indexUsuario] = objetoSocket.usuario;

        io.in(objetoSocket.idSala).emit("usuarioListo", lobbyCarrera.usuarios);

      }
    }
  });



  socket.on('lanzarObjeto', (objetoSocket) => {

    try {
      const existeSala = listaLobbies
      .findIndex(sala => sala.id === objetoSocket.idSala);
    if (existeSala !== -1) {
      var usuariosCarrera = listaLobbies[existeSala].usuarios
      var carreraOrdenada = Object.values( listaLobbies[existeSala].usuarios);
      var escudosRestanes = 0;
      var restarEscudo = false;
      carreraOrdenada.sort((a, b) => b.puntuacion - a.puntuacion);
      const posicionUsuario = carreraOrdenada.findIndex(usuario => usuario.uid === objetoSocket['idUsuario']);
      const primerUsuarioOrdenado = carreraOrdenada[0]
      var usuarioDelanteDeMiOrdenado = carreraOrdenada[posicionUsuario - 1]
      var usuarioDelanteDeMi

      if (usuarioDelanteDeMiOrdenado) {
         usuarioDelanteDeMi =  usuariosCarrera.find(usuario => usuario.uid === usuarioDelanteDeMiOrdenado.uid);
      }

      const primerUsuario =  usuariosCarrera.find(usuario => usuario.uid === primerUsuarioOrdenado.uid);
      const miUsuario = usuariosCarrera.find(usuario => usuario.uid === objetoSocket['idUsuario']);
      const misItems = miUsuario.objetosEquipados
      const itemLanzado = misItems.findIndex(item => item.id === objetoSocket['idItem']);

      if (objetoSocket['idItem'] === 6) {
        usuarioDelanteDeMi = primerUsuario
      }



      if (usuarioDelanteDeMi) {
        misItems.splice(itemLanzado, 1); // Elimina el usuario con el uid dado

        var usuarioObjetivoTieneEscudo = usuarioDelanteDeMi.objetosEquipados?.findIndex(item => item.id === 7);


        if ((usuarioObjetivoTieneEscudo === -1 || usuarioObjetivoTieneEscudo === undefined)) {
          if (objetoSocket['impacto']) {

            if (objetoSocket['idItem'] !== 1) { // 1 es el potenciador que va por otro lado.
              usuarioDelanteDeMi.puntuacion -= objetoSocket['impacto']
              // usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - objetoSocket['altoJugador']);

            }


          } else {

            if (objetoSocket['idItem'] === 2) {

              const puntuacionRival = usuarioDelanteDeMi.puntuacion;
              const miPuntuacion = miUsuario.puntuacion;
              usuarioDelanteDeMi.puntuacion = miPuntuacion;
              miUsuario.puntuacion = puntuacionRival;
              // miUsuario.localizacion = (miUsuario.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - objetoSocket['altoJugador']);
              // usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - objetoSocket['altoJugador']);

            } else if (objetoSocket['idItem'] === 3) {
              usuarioDelanteDeMi.puntuacion = 0;
              // usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - objetoSocket['altoJugador']);

            }
            else if (objetoSocket['idItem'] === 4) {
              usuarioDelanteDeMi.puntuacion = miUsuario.puntuacion - 1;
              // usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - objetoSocket['altoJugador']);

            }
            else if (objetoSocket['idItem'] === 5) {
              miUsuario.puntuacion = usuarioDelanteDeMi.puntuacion + 1
              // miUsuario.localizacion = (miUsuario.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - objetoSocket['altoJugador']);


            }
            else if (objetoSocket['idItem'] === 6) {


              miUsuario.puntuacion = primerUsuario.puntuacion + 1;
              // miUsuario.localizacion = (miUsuario.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - objetoSocket['altoJugador']);

            }

          }
        } else {
          escudosRestanes = usuarioDelanteDeMi.objetosEquipados.find(item => item.id === 7).cantidad;
          usuarioDelanteDeMi.objetosEquipados.splice(usuarioObjetivoTieneEscudo, 1);
          restarEscudo = true;

        }






      }

      if (objetoSocket['idItem'] === 1) {
        misItems.splice(itemLanzado, 1); // Elimina el usuario con el uid dado
        miUsuario.puntuacion += objetoSocket['impacto']
        usuarioDelanteDeMi =miUsuario;
        // miUsuario.localizacion = (miUsuario.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - objetoSocket['altoJugador']);
      }

      const objetoRespuesta = {
        usuarios: listaLobbies[existeSala].usuarios,
        idUsuario: objetoSocket['idUsuario'],
        itemCantidad: objetoSocket['itemCantidad'],
        itemNombre: objetoSocket['itemNombre'],
        itemIcono:objetoSocket['itemIcono'],
        usuarioAfectado: usuarioDelanteDeMi,
        restarEscudo:restarEscudo,
        escudosRestantes:escudosRestanes
      }

      io.in(objetoSocket.idSala).emit("lanzarObjeto", objetoRespuesta);




    }

      
    } catch (error) {
      
    }









  });


  socket.on('expulsarUsuario', (objetoSocket) => {
    io.in(objetoSocket.idSala).emit("detectarExpulsion", objetoSocket);

  });



  socket.on('eliminarCarrera', (objetoSocket) => {
    const existeSala = listaLobbies.findIndex(sala => sala.id === objetoSocket)
    listaLobbies.splice(existeSala, 1); // Elimina el usuario con el uid dado

  });


  socket.on('anfitrionEliminaSala', (objetoSocket) => {
    io.in(objetoSocket).emit("avisoEliminarSala", objetoSocket);


  });

  socket.on('disconnect', () => {
  });
})

server.listen(PORT);

