import express from 'express'
import { Server as WebSocketServer } from 'socket.io'
import http from 'http'
import cors from 'cors'; // Importa el paquete cors
import { v4 as uuidv4 } from 'uuid';

import compression from 'compression';

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
const listaDuelos = [];
const listaDuelosSalas = [];
app.use(express.static(__dirname + '/public'))
app.use(compression());

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
        socket.join(objetoSocket.idSala);
        io.in(objetoSocket.idSala).emit("usuarioUnidoSala", listaLobbies[existeSala].usuarios);

      } else {
        socket.emit("usuarioUnidoSala", "lleno");

      }


    }

  });


  socket.on('buscarPartida', (objetoSocket) => {
    try {
      
 console.log('llegamos a buscar back',objetoSocket);
    objetoSocket.socket = socket.id;
    listaDuelos.push(objetoSocket)

    const maxTiempoSegundos = 5; // Número máximo de segundos para la búsqueda
    let tiempoTranscurrido = 0;
    let primerRival = null;
    
    let miUsuarioEnDuelo = listaDuelos.findIndex(usuario => usuario.usuario === objetoSocket.usuario);

    const temporizador = setInterval(() => {
      tiempoTranscurrido++;
      primerRival = listaDuelos.find(objeto => objeto.usuario !== objetoSocket.usuario && objeto.estado === 'buscando');
      let primerRivalPosicion = listaDuelos.findIndex(objeto => objeto.usuario !== objetoSocket.usuario && objeto.estado === 'buscando');

      miUsuarioEnDuelo = listaDuelos.findIndex(usuario => usuario.usuario === objetoSocket.usuario);

      if (miUsuarioEnDuelo === -1) {
        clearInterval(temporizador);
        return;
      }

      
      if (primerRivalPosicion !== -1) {
        clearInterval(temporizador);
        const nuevoUUID = uuidv4();

        primerRival.idSala= nuevoUUID;
        primerRival.posicion= 2;
        primerRival.socketRival =objetoSocket.socket;

        objetoSocket.idSala = nuevoUUID;
        objetoSocket.posicion= 1;    
        objetoSocket.socketRival = primerRival.socket;
        listaDuelos.splice(primerRivalPosicion, 1); 
        listaDuelos.splice(miUsuarioEnDuelo, 1);

        const objetoSala = {
          id:nuevoUUID,
          usuario1:objetoSocket,
          usuario2:primerRival      
        }

        listaDuelosSalas.push(objetoSala)
    
        socket.emit("partidaEncontrada",objetoSala)
        socket.to(primerRival.socket).emit("partidaEncontrada",objetoSala)

        // Puedes continuar con el código después de encontrar al primer rival
      } else if (tiempoTranscurrido >= maxTiempoSegundos) {
        clearInterval(temporizador);
        miUsuarioEnDuelo = listaDuelos.findIndex(usuario => usuario.usuario === objetoSocket.usuario);
        listaDuelos.splice(miUsuarioEnDuelo, 1);
        socket.emit("partidaEncontrada","Limite de tiempo")
      
        console.log(`Se ha agotado el tiempo después de ${maxTiempoSegundos} segundos. No se encontró un rival.`);
        // Puedes manejar la situación cuando no se encuentra un rival después del tiempo especificado
      } else {
        socket.emit("partidaEncontrada","buscando...")

        console.log(`Tiempo transcurrido: ${tiempoTranscurrido} segundos. Continuando la búsqueda...`);
        // Puedes agregar un pequeño retraso aquí si es necesario
        // await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }, 1000); // Este temporizador se ejecuta cada segundo

  } catch (error) {
    clearInterval(temporizador);

  }
  });


  socket.on('aceptarDuelo', (objetoSocket) => {
    let salaEncontrada = listaDuelosSalas.find(sala => sala.id === objetoSocket.id);
    socket.join(objetoSocket.id);

    if (objetoSocket.realizaEvento ==='usuario1') {
      salaEncontrada['usuario1'].aceptado=true;
      salaEncontrada['usuario1'].listo=false;
    }else {
      salaEncontrada['usuario2'].aceptado=true;
      salaEncontrada['usuario2'].listo=false;
    }
    io.to(objetoSocket.id).emit("aceptarDuelo", salaEncontrada);

  });


  socket.on('rechazarDuelo', (objetoSocket) => {
    let salaEncontrada = listaDuelosSalas.findIndex(sala => sala.id === objetoSocket.id);
    if (salaEncontrada !== -1) {
      listaDuelos.splice(salaEncontrada, 1);

    }


    io.to(objetoSocket.socket).emit("rechazarDuelo", objetoSocket);

  });


  socket.on('rechazarDueloSala', (objetoSocket) => {
    console.log('rechazando',objetoSocket)
    let salaEncontrada = listaDuelosSalas.findIndex(sala => sala.id === objetoSocket.id);
    if (salaEncontrada !== -1) {
      listaDuelos.splice(salaEncontrada, 1);

    }

    socket.leave(objetoSocket.id);
    socket.to(objetoSocket.id).emit('rechazarDueloSala', objetoSocket);

    // io.to(objetoSocket.idSala).emit("rechazarDueloSala", objetoSocket);

  });

  socket.on('comenzarCarrera', (objetoSocket) => {
 
    console.log('comenzarCarrera',objetoSocket);
    io.in(objetoSocket.id).emit("comenzarCarrera", objetoSocket);
    

  });

  socket.on('correrDuelo', (objetoCorrer) => {
 
    console.log('correrDuelo',objetoCorrer);
    const puntuacionObj = {
      puntuacion:objetoCorrer.puntuacion
    }
    io.to(objetoCorrer.socket).emit("correrDuelo", puntuacionObj);
    
  });

  

  socket.on('usuarioUnidoADuelo', (objetoSocket) => {
 try {
  console.log('llegamos',objetoSocket);
  let sala = listaDuelosSalas.find(objeto => objeto.id === objetoSocket.id);
  console.log('aqui',sala.usuario1.usuario);
   if (sala.usuario1.usuario===objetoSocket.realizaEvento) {
    sala.usuario1.listo =true;
   }
  
   if (sala.usuario2.usuario===objetoSocket.realizaEvento) {
    sala.usuario2.listo =true;
   }
  
   io.in(objetoSocket.id).emit("usuarioUnidoADuelo", sala);
  
 } 

 catch (error) {
  
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
      if (existeSala) {
        const indexUsuario = existeSala.usuarios
          .findIndex(usuario => usuario.uid === objetoSocket.id);
          if (indexUsuario !== -1) { 

            existeSala.usuarios.splice(indexUsuario, 1); // Elimina el usuario con el uid dado
            socket.leave(objetoSocket.idSala);
          }



        io.in(existeSala.id).emit("usuarioAbandonaSala", existeSala);
  
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



  socket.on('anfitrionInactivo', (objetoSocket) => {
   
    io.in(objetoSocket).emit("anfitrionInactivo",objetoSocket );


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
        // misItems.splice(itemLanzado, 1); // Elimina el usuario con el uid dado

        var usuarioObjetivoTieneEscudo = usuarioDelanteDeMi.objetosEquipados?.findIndex(item => item.id === 7);
       
        if ((usuarioObjetivoTieneEscudo === -1 || usuarioObjetivoTieneEscudo === undefined)) {
          // si no tiene escudo
          if (objetoSocket['impacto']) {

            if (objetoSocket['idItem'] !== 1) { // 1 es el potenciador que va por otro lado.
              usuarioDelanteDeMi.puntuacion -= objetoSocket['impacto']
              // usuarioDelanteDeMi.localizacion = (usuarioDelanteDeMi.puntuacion / objetoSocket['maximoTotalPasos']) * (objetoSocket['anchoDelDiv'] - objetoSocket['altoJugador']);
              misItems.splice(itemLanzado, 1); // Elimina el usuario con el uid dado

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
            misItems.splice(itemLanzado, 1); // Elimina el usuario con el uid dado

          }
        } else {
          //si tiene escudo
          escudosRestanes = usuarioDelanteDeMi.objetosEquipados.find(item => item.id === 7).cantidad;
          usuarioDelanteDeMi.objetosEquipados.splice(usuarioObjetivoTieneEscudo, 1);
          misItems.splice(itemLanzado, 1); // Elimina el usuario con el uid dado
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


  socket.on('suscribirChat', (objetoSocket) => {
    socket.broadcast.emit("mensajesNuevosChat", objetoSocket);

  });


  socket.on('disconnect', () => {
  });
})

server.listen(PORT);

