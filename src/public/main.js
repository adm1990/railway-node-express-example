console.log('Leido jss');
const socket = io(); 

socket.on('nuevaConexion', () => {
    console.log('Una nueva conexion');
    // socket.emit('pong');
})