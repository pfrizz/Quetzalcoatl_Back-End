const mysql = require('/opt/db_access/nodejs/node_modules/mysql');
const db_access = require('/opt/db_access/nodejs/db_access');

exports.handler = async (event) => {
    // get credentials from the db_access layer (loaded separately via AWS console)
    var pool = mysql.createPool({
        host: db_access.config.host,
        user: db_access.config.user,
        password: db_access.config.password,
        database: db_access.config.database
    });
        
    let doesVenueExist = (venueID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Venues WHERE venueID=?", [venueID], (error, rows) => {
                if (error) { return reject(error); }
                let doesExist = rows.length > 0;
                return resolve(doesExist)
            });
        });
    }
    
    let doesShowExist = (showID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Shows WHERE showID=?", [showID], (error, rows) => {
                if (error) { return reject(error); }
                let doesExist = rows.length > 0;
                return resolve(doesExist)
            });
        });
    }
    

    let reserveSeat = (venueID, showID, sectionType, seatRow, seatColumn) => {
        return new Promise((resolve, reject) => {
            pool.query("CALL `seats4u`.`reserveSeat`(?, ?, ?, ?, ?)", [venueID, showID, sectionType, seatRow, seatColumn], (error, rows) => {
                if (error) { return reject(error); }
                return resolve()
            });
        });
    }


    let response = undefined
    try {
        //error checking
        if(!await doesVenueExist(event.venueID)){ throw ("A venue with the ID '" + event.venueID + "' does not exist")};
        if(!await doesShowExist(event.showID)){ throw ("A show with the ID '" + event.showID + "' does not exist")};
       
        
        await reserveSeat(event.venueID, event.showID, event.sectionType, event.seatRow, event.seatColumn);

        response = {
            statusCode: 200
        }
    } catch (err) {
        response = {
            statusCode: 400,
            error: err
        }
    } finally {
        //close the connection to the database
        pool.end()
    }

    return response;
}
