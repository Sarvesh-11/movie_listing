const mysql      = require('mysql');

const connection = mysql.createConnection({
  host     : '127.0.0.1',
  user     : 'root',
  database : 'movies',
  password : 'root',
  port: 3306
});

connection.connect(function(err) {
    if (err) {
        console.error('Error Connecting: ' + err.stack);
        process.exit(1);
    }
    console.log(`MYSQL connected: ${connection.config.user}@${connection.config.host}:${connection.config.port}, thread ID: ${connection.threadId}`);
});

module.exports = connection;