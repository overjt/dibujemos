var express = require('express');
var app = express();
var path = require('path');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Canvas = require('canvas');
var connections = 0;
var canvas = new Canvas(1900, 1000);
var ctx = canvas.getContext('2d');
var clients = {};

app.set('timer', process.env.TIMER || 180);
var timer = app.get('timer');
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', function(req, res) {
    res.render('index', {
        title: 'Dibujemos'
    });
});

function moveHandler(data) {
    if (data.drawing && clients[data.id]) {
        drawLine(clients[data.id].x, clients[data.id].y, data.x, data.y, data.color);
    }

    // actualizamos el estado
    clients[data.id] = data;
    clients[data.id].updated = Date.now();
}

function drawLine(fromx, fromy, tox, toy, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();

}

io.on('connection', function(socket) {
    connections++;
    console.log('connected', connections);
    socket.emit('init', {
        connections: connections,
        paper: canvas.toDataURL(),
        timer: timer
    });
    socket.broadcast.emit('connections', {
        connections: connections
    });

    socket.on('mousemove', function(data) {
        moveHandler(data);
        socket.broadcast.emit('move', data);
    });
    socket.on('disconnect', function() {
        connections--;
        console.log("Client disconnected");
        console.log('connected', connections);
        socket.broadcast.emit('connections', {
            connections: connections
        });
    });
});
server.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});

setInterval(function() {
    timer = timer - 1;
    if (timer <= 0) {
    	timer = app.get('timer');
        io.sockets.emit('clear', {
            timer: timer
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
    }
}, 1000);