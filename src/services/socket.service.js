const { Server } = require('socket.io');

let io = null;

const socketService = {
  /**
   * Initialize Socket.io Server instance
   * @param {object} server - HTTP Node server instance
   */
  init: (server) => {
    io = new Server(server, {
      cors: {
        origin: '*', // Allow connections from all origins in dev
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log(`Socket client connected: ${socket.id}`);

      // Handle custom events here in Phase 2
      socket.on('disconnect', () => {
        console.log(`Socket client disconnected: ${socket.id}`);
      });
    });

    console.log('Socket.io Service initialized.');
    return io;
  },

  /**
   * Get reference to global IO connection object
   * @returns {object} socket.io server instance
   */
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },

  /**
   * Emit socket events to specific rooms or clients
   * @param {string} event - event identifier
   * @param {any} data - event payload
   * @param {string} [room] - targeted socket room name
   */
  emit: (event, data, room = null) => {
    if (!io) return;
    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }
  },
};

module.exports = socketService;
