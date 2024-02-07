const mysql = require('mysql2');

var db = mysql.createConnection({
    host: 'localhost',
    database: 'cruddb',
    user: 'root',
    password: '',

});


module.exports = db; 
