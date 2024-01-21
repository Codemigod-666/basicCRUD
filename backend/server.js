const express = require('express');
const path = require('path');
const db = require('./database');
const cors = require('cors');
const XLSX = require('xlsx');
const moment = require('moment');
// const { Connection } = require('mysql2/typings/mysql/lib/Connection');

// fetching the file from xlsx sheet 

const workbook = XLSX.readFile('FileMain.xlsx');

const sheetName = workbook.SheetNames;
const sheet = workbook.Sheets[sheetName];

const employeeData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName[0]], {
    raw: false,
});

var app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.get('/api/data', (req, res) => {
    // res.send('hey there!!');
    let sql = 'select * from users';
    db.query(sql, (err, results) => {
        if (err) throw err;
        // res.send({data: results});
        res.send({data: results});
    })
    // res.sendFile(path.join(__dirname,'./index.html'));
});

app.get('/api/data2', (req, res) => {
    let sql = `
        WITH partitioned AS (
            SELECT
                *,
                CAST(DATEDIFF(\`Time\`, '2023-08-01 00:00:00') AS SIGNED) - ROW_NUMBER() OVER (PARTITION BY Position_ID ORDER BY \`Time\` ASC) AS PartID
            FROM
                employee_assignment
            WHERE
                \`Time\` IS NOT NULL
        )
        SELECT
            Position_ID,
            MIN(\`Time\`) AS StartDate,
            COUNT(*) AS DayCount
        FROM
            partitioned
        GROUP BY
            Position_ID, PartID
        HAVING
            COUNT(*) > 6
        ORDER BY 
            PartID;
    `;

    db.query(sql, (err, results) => {
        if (err) throw err;
        // res.send({data: results});
        res.send({data: results});
    })
});

app.get('/api/data3', (req, res) => {
    let sql = `
        SELECT
            t1.Position_ID,
            t1.Position_Status,
            t1.Employee_Name,
            t1.\`Time\` AS Shift_Start,
            MIN(t2.\`Time\`) AS Next_Shift_Start,
            TIMEDIFF(MIN(t2.\`Time\`), t1.\`Time\`) AS Time_Between_Shifts
        FROM
            employee_assignment t1
        JOIN
            employee_assignment t2 ON t1.Position_ID = t2.Position_ID
                            AND t1.Employee_Name = t2.Employee_Name
                            AND t2.\`Time\` > t1.\`Time\`
                            AND t2.\`Time\` IS NOT NULL
        GROUP BY
            t1.Position_ID, t1.Position_Status, t1.Employee_Name, t1.\`Time\`
        HAVING
            Time_Between_Shifts > '01:00:00' AND Time_Between_Shifts < '10:00:00';
    `;

    db.query(sql, (err, results) => {
        if (err) throw err;
        // res.send({data: results});
        res.send({data: results});
    })
})

app.get('/api/data4', (req,res) => {
    let sql = `SELECT
                Position_ID,
                Position_Status,
                Employee_Name,
                \`Time\` AS Shift_Start,
                Time_Out AS Shift_End,
                Timecard_Hours AS Total_Hours_Worked
            FROM
                employee_assignment
            WHERE
                \`Time\` IS NOT NULL
                AND Time_Out IS NOT NULL
                AND TIME_TO_SEC(Timecard_Hours) > (14 * 3600);`;
    
    db.query(sql, (err, results) => {
        if (err) throw err;
        // res.send({data: results});
        res.send({data: results});
    })

})

app.listen(port, () => {
    console.log("Listening to the port: ", port);
    db.connect((err) => {
        if(err){
            console.log("Cannot connect to MySQL database:"+ err);
            return;
        }
        console.log("database connected");
    })
});

const name = 'employee_assignment';
async function createTableIfNotExist(name){
    try{
        db.connect();
        const createTableQuery = 
            `   CREATE TABLE IF NOT EXISTS ${name} (
                    u_ID INT PRIMARY KEY,
                    Position_ID VARCHAR(255)    ,
                    Position_Status VARCHAR(255),
                    Time DATETIME,
                    Time_Out DATETIME,
                    Timecard_Hours TIME,
                    Pay_Cycle_Start_Date DATE,
                    Pay_Cycle_End_Date DATE,
                    Employee_Name VARCHAR(255),
                    File_Number VARCHAR(255)
                );
            `;

        db.query(createTableQuery);
        console.log(`Table ${name} created or already exists`);

    } catch(error){
        console.error("Error while createing table: ", error);
    }
}

async function insertTableData (name){
    try {
        db.connect();
        const insertDataQuery = `
                INSERT INTO ${name} 
                    (u_ID, Position_ID, Position_Status, Time, Time_Out, Timecard_Hours, Pay_Cycle_Start_Date, Pay_Cycle_End_Date, Employee_Name, File_Number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;

        // db.query(insertDataQuery, [employeeData.map(Object.values)]);
        employeeData.forEach( (obj, index) => {
            const values = [
                index, 
                obj['Position ID'],
                obj['Position Status'],
                new Date(obj['Time']),
                new Date(obj['Time Out']),
                obj['Timecard Hours (as Time)'],
                new Date(obj['Pay Cycle Start Date']),
                new Date(obj['Pay Cycle End Date']),
                obj['Employee Name'],
                obj['File Number']
            ];

            db.query(insertDataQuery, values, (error, results, fields) => {
                if(error){
                    console.error('Error inserting data: ', error);
                }else {
                    console.log('Data inserted successfully');
                    // console.log('result: ', results);
                    // console.log('fields: ', fields);
                }
            })
        })


        console.log(`Data inserted successfully in ${name} Table.`);
    } catch (error) {
        console.log("Error While inserting the data", error);
    }
}

// createTableIfNotExist(name);


setTimeout(() => {
    // insertTableData(name);
}, 3000);