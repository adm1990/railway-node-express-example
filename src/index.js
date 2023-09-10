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

  console.log('nueva conexion: ', socket.id);
  socket.emit('nuevaConexion');

  // socket.on('pong' ,() => {
  //     console.log('pong recibido del cliente');
  // })

  socket.on('conectarSala', (objetoSocket) => {
    console.log('conectando a sala', objetoSocket)
    socket.join(objetoSocket.idSala);
    objetoSocket.usuario.socket = socket.id;
    console.log('ID SOCKET ',  objetoSocket.usuario.socket )

    const existeSala = listaLobbies
      .findIndex(sala => sala.id === objetoSocket.idSala);

    console.log('EXISTE?', existeSala);
    if (existeSala === -1) {
      var objetoSala = {
        id: objetoSocket.idSala,
        usuarios: [objetoSocket.usuario]
      }

      listaLobbies.push(objetoSala)
      console.log('añadimos y creamos sala', listaLobbies);
      io.in(objetoSocket.idSala).emit("usuarioUnidoSala",  objetoSala.usuarios);

    } else {

      console.log('LA SALA YA EXISTE', listaLobbies[existeSala]);
      var lobbyCarrera = listaLobbies[existeSala]

      const indexUsuario = lobbyCarrera.usuarios
        .findIndex(usuario => usuario.uid === objetoSocket.usuario['uid']);

      if (indexUsuario === -1) {
        listaLobbies[existeSala].usuarios.push(objetoSocket.usuario);
        console.log('ya existia, solo añadimos el usuario');
      }
      io.in(objetoSocket.idSala).emit("usuarioUnidoSala",  listaLobbies[existeSala].usuarios);


    }

  });


  socket.on('obtenerLobbyCarrera', (idCarrera) => {
    console.log('me solicitan el lobby de la carrera', idCarrera)
    const existeSala = listaLobbies
      .findIndex(sala => sala.id === idCarrera);

    if (existeSala !== -1) {
      var lobbyCarrera = listaLobbies[existeSala]
    
      io.in(idCarrera).emit("obtenerLobby", lobbyCarrera);

    }


  });



  socket.on('abandonarSala', (objetoSocket) => {

    console.log('abandona sala usuario', objetoSocket);
    const existeSala = listaLobbies.find(sala => sala.id === objetoSocket.idSala)
      var lobbyCarrera;
    if (existeSala) {
      console.log('ENTRAMOS A ELIMINAR');
      const indexUsuario = existeSala.usuarios
        .findIndex(usuario => usuario.uid === objetoSocket.id);
        existeSala.usuarios.splice(indexUsuario, 1); // Elimina el usuario con el uid dado
      socket.leave(objetoSocket.idSala);
      io.in(existeSala.id).emit("usuarioAbandonaSala",existeSala.usuarios);

    } 



  });

  socket.on('irACarrera', (objetoSocket) => {
    console.log('El administrador ha empezado la carrera')
    io.in(objetoSocket.idSala).emit("irACarrera", null);


  });

  socket.on('usuarioListoCarrera', (objetoSocket) => {
    console.log('El usuario está listo para empezar la carrera contador')
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

  io.in(objetoSocket.idSala).emit("corriendo", usuarioQueHaCorrido);

}

 

    }



  });

  socket.on('usuarioListo', (objetoSocket) => {
    console.log('El usuario está listo', objetoSocket)
    const existeSala = listaLobbies
      .findIndex(sala => sala.id === objetoSocket.idSala);

    if (existeSala !== -1) {
      console.log('USUARIO LISTO');
      var lobbyCarrera = listaLobbies[existeSala]
      const indexUsuario = lobbyCarrera.usuarios
        .findIndex(usuario => usuario.uid === objetoSocket.usuario.uid);

      if (indexUsuario !== -1) {
        console.log('el usuario existe');
        lobbyCarrera.usuarios[indexUsuario] =objetoSocket.usuario;
  
        io.in(objetoSocket.idSala).emit("usuarioListo", lobbyCarrera.usuarios);

      }
    }







  });

  socket.on('lanzarObjeto', (objetoSocket) => {
    console.log('El usuario lanza un objeto',objetoSocket)

    const existeSala = listaLobbies
    .findIndex(sala => sala.id === objetoSocket.idSala);
    if (existeSala !== -1) {
      var usuariosCarrera = listaLobbies[existeSala].usuarios
      console.log('usuarios de la carrera');
      usuariosCarrera.sort((a, b) => b.puntuacion - a.puntuacion);
      const posicionUsuario = usuariosCarrera.findIndex(usuario => usuario.uid === objetoSocket['idUsuario']);
      console.log('mi posicion actual', posicionUsuario);
      const usuarioDelanteDeMi = usuariosCarrera[posicionUsuario - 1]
      console.log('mi posicion delante de mi', usuarioDelanteDeMi.alias);
      console.log('ITEMS DE MI RIVAL', usuarioDelanteDeMi.alias);
      const primerUsuario = usuariosCarrera[0]
      console.log('El pimer usuario es',primerUsuario.alias);
      const miUsuario = usuariosCarrera.find(usuario => usuario.uid === objetoSocket['idUsuario']);
      const misItems = miUsuario.objetosEquipados
      const itemLanzado = misItems.findIndex(item => item.id === objetoSocket['idItem']);


      if (usuarioDelanteDeMi) {
        misItems.splice(itemLanzado, 1); // Elimina el usuario con el uid dado
        console.log('item eliminado', misItems);

        var usuarioObjetivoTieneEscudo = usuarioDelanteDeMi.objetosEquipados.findIndex(item => item.id === 7);
  
        if (objetoSocket['idItem'] === 6) {
           usuarioObjetivoTieneEscudo = primerUsuario.objetosEquipados.findIndex(item => item.id === 7);
        }


        console.log('TIENE ESCUDO',usuarioObjetivoTieneEscudo);
        console.log('ha usado',objetoSocket['idItem']);

        if (usuarioObjetivoTieneEscudo === -1 || usuarioObjetivoTieneEscudo === undefined ) {
          if (objetoSocket['impacto']) {
            console.log('el objeto tiene impacto');
  
            if (objetoSocket['idItem'] !== 1) { // 1 es el potenciador que va por otro lado.
              usuarioDelanteDeMi.puntuacion -= objetoSocket['impacto']
              usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

            }
       
  
          } else {
  
            console.log('si no tiene impacto es que tiene efecto');
            if (objetoSocket['idItem'] === 2) {

              const puntuacionRival = usuarioDelanteDeMi.puntuacion;
              const miPuntuacion = miUsuario.puntuacion;
              usuarioDelanteDeMi.puntuacion = miPuntuacion;
              miUsuario.puntuacion = puntuacionRival;
              miUsuario.localizacion = (miUsuario.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);
              usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

              console.log('cambio de puntuaciones', miUsuario.puntuacion, usuarioDelanteDeMi.puntuacion);
            } else if (objetoSocket['idItem'] === 3){
              usuarioDelanteDeMi.puntuacion = 0;
              usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

            }
            else if (objetoSocket['idItem'] === 4){
              console.log('one down');
              usuarioDelanteDeMi.puntuacion =  miUsuario.puntuacion -1;
              usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

            }
            else if (objetoSocket['idItem'] === 5){
              console.log('one UP');
             miUsuario.puntuacion = usuarioDelanteDeMi.puntuacion +1
             miUsuario.localizacion = (miUsuario.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

  
            }
            else if (objetoSocket['idItem'] === 6){

              console.log('one for all');
       
                miUsuario.puntuacion = primerUsuario.puntuacion +1;
                miUsuario.localizacion = (miUsuario.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - 40);

             }
  
          }
        } else {

          if (objetoSocket['idItem'] === 6) {
            primerUsuario.objetosEquipados.splice(usuarioObjetivoTieneEscudo, 1); 
         } else {
          usuarioDelanteDeMi.objetosEquipados.splice(usuarioObjetivoTieneEscudo, 1); 

         }

        }


    



      } 

      if (objetoSocket['idItem'] === 1) {
        misItems.splice(itemLanzado, 1); // Elimina el usuario con el uid dado
        console.log('ha usado un potenciador');
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
    console.log('Expulsar usuario',objetoSocket)
       io.in(objetoSocket.idSala).emit("detectarExpulsion",objetoSocket);

  });



  socket.on('eliminarCarrera', (objetoSocket) => {
    console.log('Eliminar carrera',objetoSocket)
    const existeSala = listaLobbies.findIndex(sala => sala.id === objetoSocket)
    listaLobbies.splice(existeSala, 1); // Elimina el usuario con el uid dado
console.log('sala eliminada',objetoSocket);

  });


  socket.on('anfitrionEliminaSala', (objetoSocket) => {
    console.log('El anfitrion se va de la sala.',objetoSocket)
    io.in(objetoSocket).emit("avisoEliminarSala",objetoSocket);


  });

  socket.on('disconnect', () => {
    console.log('usuario desconectado')
  });
})

server.listen(PORT);
console.log(`Tu server está listo en el puerto ${PORT}`);

