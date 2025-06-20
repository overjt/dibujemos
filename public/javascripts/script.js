(function() {
    // Check for canvas support
    if (!('getContext' in document.createElement('canvas'))) {
        alert('Sorry, your browser doesn\'t support canvas!');
        return false;
    }

    // Modern DOM ready function
    function domReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    domReady(function() {
        // Configuration
        const config = {
            rateLimitMs: 30,
            reconnectAttempts: 5,
            reconnectDelay: 1000,
            cleanupInterval: 10000,
            pingInterval: 2000
        };

        // Get DOM elements
        const canvas = document.getElementById('paper');
        const instructions = document.getElementById('instructions');
        const connections = document.getElementById('connections');
        const timerDiv = document.getElementById('timer');
        const latencyDiv = document.getElementById('latency');
        const colorPicker = document.getElementById('colorPicker');
        const ctx = canvas.getContext('2d');

        // Hide latency display initially
        latencyDiv.style.display = 'none';

        // Application state
        const state = {
            drawing: false,
            clients: {},
            cursors: {},
            prev: {},
            lastEmit: Date.now(),
            cursorColor: randomColor(),
            timer: 0,
            disconnected: false,
            startTime: Date.now(),
            id: Math.round(Date.now() * Math.random()),
            reconnectAttempts: 0
        };

        // Initialize Socket.IO connection
        const socket = io({
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true
        });

        // Initialize color picker
        initializeColorPicker();

        // Socket event handlers
        setupSocketEvents();

        // DOM event handlers
        setupDOMEvents();

        // Start intervals
        startIntervals();

        /**
         * Initialize color picker
         */
        function initializeColorPicker() {
            if (typeof window.colpick !== 'undefined') {
                colorPicker.colpick({
                    submit: 0,
                    layout: 'rgbhex',
                    color: state.cursorColor.slice(1),
                    onChange: function(hsb, hex, rgb, el, bySetColor) {
                        el.style.backgroundColor = '#' + hex;
                        state.cursorColor = '#' + hex;
                        if (!bySetColor) el.value = hex;
                    }
                });

                colorPicker.addEventListener('keyup', function() {
                    if (typeof this.colpickSetColor === 'function') {
                        this.colpickSetColor(this.value);
                    }
                });
            }

            colorPicker.style.backgroundColor = state.cursorColor;
        }

        /**
         * Setup Socket.IO event handlers
         */
        function setupSocketEvents() {
            socket.on('connect', function() {
                console.log('Connected to server');
                state.disconnected = false;
                state.reconnectAttempts = 0;
                timerDiv.style.color = '';
            });

            socket.on('disconnect', function() {
                console.log('Disconnected from server');
                timerDiv.style.color = 'red';
                latencyDiv.textContent = '';
                state.disconnected = true;
            });

            socket.on('connect_error', function(error) {
                console.error('Connection error:', error);
                handleReconnection();
            });

            socket.on('move', moveHandler);

            socket.on('clear', function(data) {
                state.timer = data.timer;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            });

            socket.on('init', function(data) {
                timerDiv.style.color = '';
                updateConnections(data.connections);

                if (state.disconnected) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    state.disconnected = false;
                }

                state.timer = data.timer;
                
                // Load canvas image
                if (data.paper) {
                    const image = new Image();
                    image.onload = function() {
                        ctx.drawImage(image, 0, 0);
                    };
                    image.onerror = function() {
                        console.error('Failed to load canvas image');
                    };
                    image.src = data.paper;
                }
            });

            socket.on('pong', function() {
                const latency = Date.now() - state.startTime;
                latencyDiv.textContent = latency + " ms";
            });

            socket.on('connections', function(data) {
                updateConnections(data.connections);
            });
        }

        /**
         * Setup DOM event handlers
         */
        function setupDOMEvents() {
            // Keyboard events for latency display
            document.addEventListener('keydown', function(e) {
                if (e.keyCode === 9) { // Tab key
                    latencyDiv.style.display = 'block';
                    e.preventDefault();
                }
            });

            document.addEventListener('keyup', function(e) {
                if (e.keyCode === 9) { // Tab key
                    latencyDiv.style.display = 'none';
                    e.preventDefault();
                }
            });

            // Canvas mouse events
            canvas.addEventListener('mousedown', mousedownHandler);
            document.addEventListener('mousemove', mousemoveHandler);
            document.addEventListener('mouseup', mouseupHandler);
            document.addEventListener('mouseleave', mouseupHandler);

            // Touch events for mobile support
            canvas.addEventListener('touchstart', function(e) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            });

            canvas.addEventListener('touchmove', function(e) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                document.dispatchEvent(mouseEvent);
            });

            canvas.addEventListener('touchend', function(e) {
                e.preventDefault();
                const mouseEvent = new MouseEvent('mouseup', {});
                document.dispatchEvent(mouseEvent);
            });
        }

        /**
         * Handle mouse movement and drawing
         */
        function moveHandler(data) {
            try {
                if (!(data.id in state.clients)) {
                    const cursor = document.createElement('div');
                    cursor.className = 'cursor';
                    document.getElementById('cursors').appendChild(cursor);
                    state.cursors[data.id] = cursor;
                }

                state.cursors[data.id].style.left = data.x + 'px';
                state.cursors[data.id].style.top = data.y + 'px';

                if (data.drawing && state.clients[data.id]) {
                    drawLine(
                        state.clients[data.id].x,
                        state.clients[data.id].y,
                        data.x,
                        data.y,
                        data.color
                    );
                }

                state.clients[data.id] = data;
                state.clients[data.id].updated = Date.now();
            } catch (error) {
                console.error('Error handling move:', error);
            }
        }

        /**
         * Handle mouse down event
         */
        function mousedownHandler(e) {
            e.preventDefault();
            state.drawing = true;
            state.prev.x = e.pageX;
            state.prev.y = e.pageY;
            instructions.style.display = 'none';
        }

        /**
         * Handle mouse move event
         */
        function mousemoveHandler(e) {
            const now = Date.now();
            
            // Rate limiting
            if (now - state.lastEmit > config.rateLimitMs) {
                const movement = {
                    x: e.pageX,
                    y: e.pageY,
                    drawing: state.drawing,
                    color: state.cursorColor,
                    id: state.id
                };

                if (socket.connected) {
                    socket.emit('mousemove', movement);
                }
                state.lastEmit = now;
            }

            if (state.drawing) {
                drawLine(state.prev.x, state.prev.y, e.pageX, e.pageY, state.cursorColor);
                state.prev.x = e.pageX;
                state.prev.y = e.pageY;
            }
        }

        /**
         * Handle mouse up event
         */
        function mouseupHandler() {
            state.drawing = false;
        }

        /**
         * Draw line on canvas
         */
        function drawLine(fromx, fromy, tox, toy, color) {
            try {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.moveTo(fromx, fromy);
                ctx.lineTo(tox, toy);
                ctx.stroke();
            } catch (error) {
                console.error('Error drawing line:', error);
            }
        }

        /**
         * Update connections display
         */
        function updateConnections(count) {
            if (count > 1) {
                connections.textContent = count + ' connected';
            } else {
                connections.textContent = count + ' connected';
            }
        }

        /**
         * Generate random color
         */
        function randomColor() {
            return '#' + (function lol(m, s, c) {
                return s[m.floor(m.random() * s.length)] +
                    (c && lol(m, s, c - 1));
            })(Math, '0123456789ABCDEF', 5);
        }

        /**
         * Handle reconnection attempts
         */
        function handleReconnection() {
            if (state.reconnectAttempts < config.reconnectAttempts) {
                state.reconnectAttempts++;
                setTimeout(function() {
                    socket.connect();
                }, config.reconnectDelay * state.reconnectAttempts);
            }
        }

        /**
         * Start application intervals
         */
        function startIntervals() {
            // Clean up old clients
            setInterval(function() {
                const now = Date.now();
                for (const ident in state.clients) {
                    if (now - state.clients[ident].updated > config.cleanupInterval) {
                        if (state.cursors[ident]) {
                            state.cursors[ident].remove();
                            delete state.cursors[ident];
                        }
                        delete state.clients[ident];
                    }
                }
            }, config.cleanupInterval);

            // Timer display update
            setInterval(function() {
                if (state.timer > 0 && !state.disconnected) {
                    const minutes = Math.floor(state.timer / 60);
                    const seconds = state.timer - minutes * 60;
                    const minutesStr = ('0' + minutes).slice(-2);
                    const secondsStr = ('0' + seconds).slice(-2);
                    timerDiv.textContent = minutesStr + ':' + secondsStr + ' to restart';
                    state.timer--;
                }

                if (state.disconnected) {
                    const dots = '.'.repeat((Date.now() % 3000 / 1000 | 0) + 1);
                    timerDiv.textContent = 'Reconnecting' + dots;
                }
            }, 1000);

            // Ping for latency measurement
            setInterval(function() {
                if (!state.disconnected && socket.connected) {
                    state.startTime = Date.now();
                    socket.emit('ping');
                }
            }, config.pingInterval);
        }
    });
})();