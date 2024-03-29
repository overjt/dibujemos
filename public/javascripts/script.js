$(function() {

    if (!('getContext' in document.createElement('canvas'))) {
        alert('Lo sentimos, tu navegador no soporta canvas!');
        return false;
    }

    var url = 'https://' + window.location.host;

    var doc = $(document);
    var win = $(window);
    var canvas = $('#paper');
    var instructions = $('#instructions');
    var connections = $('#connections');
    var timerdiv = $('#timer');
    var latencydiv = $('#latency');
    latencydiv.hide();
    var ctx = canvas[0].getContext('2d');
    var id = Math.round($.now() * Math.random());


    var drawing = false;
    var clients = {};
    var cursors = {};
    var prev = {};
    var lastEmit = $.now();
    var cursorColor = randomColor();
    var timer = 0;
    var socket = io.connect(url);
    var disconnected = false;
    var startTime = Date.now();
    $('body').keydown(function(e) {
        var code = e.keyCode || e.which;
        if (code == '9') {
            latencydiv.fadeIn("fast", function() {});
            return false;
        }
    });
    $('body').keyup(function(e) {
        var code = e.keyCode || e.which;
        if (code == '9') {
            latencydiv.fadeOut("fast", function() {});
            return false;
        }
    });
    $('#colorPicker').colpick({
        submit: 0,
        layout: 'rgbhex',
        color: cursorColor.slice(1),
        onChange: function(hsb, hex, rgb, el, bySetColor) {
            $(el).css('background-color', '#' + hex);
            cursorColor = '#' + hex;
            // Fill the text box just if the color was set using the picker, and not the colpickSetColor function.
            if (!bySetColor) $(el).val(hex);
        }
    }).keyup(function() {
        $(this).colpickSetColor(this.value);
    }).css('background-color', cursorColor);

    function moveHandler(data) {
        if (!(data.id in clients)) {
            cursors[data.id] = $('<div class="cursor">').appendTo('#cursors');
        }
        cursors[data.id].css({
            'left': data.x,
            'top': data.y
        });

        if (data.drawing && clients[data.id]) {
            drawLine(clients[data.id].x, clients[data.id].y, data.x, data.y, data.color);
        }
        clients[data.id] = data;
        clients[data.id].updated = $.now();
    }

    function mousedownHandler(e) {
        e.preventDefault();
        drawing = true;
        prev.x = e.pageX;
        prev.y = e.pageY;
        instructions.fadeOut();
    }

    function mousemoveHandler(e) {
        if ($.now() - lastEmit > 30) {
            var movement = {
                'x': e.pageX,
                'y': e.pageY,
                'drawing': drawing,
                'color': cursorColor,
                'id': id
            };
            socket.emit('mousemove', movement);
            lastEmit = $.now();
        }

        if (drawing) {

            drawLine(prev.x, prev.y, e.pageX, e.pageY, cursorColor);

            prev.x = e.pageX;
            prev.y = e.pageY;
        }
    }

    function drawLine(fromx, fromy, tox, toy, color) {
        ctx.beginPath(); // create a new empty path (no subpaths!)
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();
    }

    function connectionHandler(data) {
        if (data.connections > 1) {
            connections.text(data.connections + ' conectados');
        } else {
            connections.text(data.connections + ' conectado');
        }
    }

    function randomColor() {
        return '#' + (function lol(m, s, c) {
            return s[m.floor(m.random() * s.length)] +
                (c && lol(m, s, c - 1));
        })(Math, '0123456789ABCDEF', 4);
    }

    /**
     * Adjuntamos los eventos
     */
    socket.on('move', moveHandler);
    socket.on('clear', function(data) {
        timer = data.timer;
        ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
    });
    socket.on('init', function(data) {
        timerdiv.css('color', '');
        if (data.connections > 1) {
            connections.text(data.connections + ' conectados');
        } else {
            connections.text(data.connections + ' conectado');
        }
        if (disconnected) {
            ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
            disconnected = false;
        }

        timer = data.timer;
        var image = new Image();
        image.src = data.paper;
        image.onload = function() {
            ctx.drawImage(image, 0, 0);
        };
    });
    socket.on('disconnect', function() {
        timerdiv.css('color', 'red');
        latencydiv.text("");
        disconnected = true;
    });
    socket.on('pong', function() {
        var latency = Date.now() - startTime;
        latencydiv.text(latency + " ms");
    });
    socket.on('connections', connectionHandler);
    canvas.on('mousedown', mousedownHandler);
    doc.on('mousemove', mousemoveHandler);

    doc.bind('mouseup mouseleave', function() {
        drawing = false;
    });

    setInterval(function() {
        for (var ident in clients) {
            if ($.now() - clients[ident].updated > 10000) {
                cursors[ident].remove();
                delete clients[ident];
                delete cursors[ident];
            }
        }
    }, 10000);
    var recoPoints = 3;
    setInterval(function() {
        if (timer > 0 && disconnected == false) {
            var minutes = Math.floor(timer / 60);
            var seconds = timer - minutes * 60;
            timerdiv.text(("0" + minutes).slice(-2) + ":" + ("0" + seconds).slice(-2) + " para reiniciar");
            timer = timer - 1;
        }
        if (disconnected) {
            var msg = "Reconectando"
            for (var i = 0; i < recoPoints; i++) {
                msg = msg + ".";
            };
            timerdiv.text(msg);
            if (recoPoints > 1) {
                recoPoints--;
            } else {
                recoPoints = 3;
            }
        }
    }, 1000);
    setInterval(function() {
        if (disconnected == false) {
            startTime = Date.now();
            socket.emit('ping');
        }
    }, 2000);
});