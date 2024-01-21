const mysql = require('mysql2');

var db = mysql.createConnection({
    host: 'localhost',
    database: 'cruddb',
    user: 'root',
    password: 'RishiVijay@02',

});


module.exports = db; 