const mysql = require('/opt/nodejs/node_modules/mysql');
const db_access = require('/opt/nodejs/db_access')

exports.handler = async (event) => {
    // get credentials from the db_access layer (loaded separately via AWS console)
    var pool = mysql.createPool({
        host: db_access.config.host,
        user: db_access.config.user,
        password: db_access.config.password,
        database: db_access.config.database
    });
    
    let isAuthorizedAsVenueManager = (userID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Venues WHERE venueID=?", [userID], (error, rows) => {
                if (error) { return reject(error); }
                let isAuthorized = rows.length > 0;
                return resolve(isAuthorized)
            });
        });
    }

    let getAvailableSeats = (showName, orderBy) => {
        return new Promise((resolve, reject) => {
            pool.query("CALL `seats4u`.`getAvailableSeats`(?, ?)", [showName, orderBy], (error, rows) => {
                if (error) { return reject(error); }
                if(rows[0].length > 0){
                    return resolve(rows[0])
                }
                else{
                    return reject("No available seats found")
                }
            });
        });
    }
    
    let response = undefined
    try {
        let isAuthorized = await isAuthorizedAsVenueManager(event.userID)
        
        if(!isAuthorized) {throw ("User is not authorized as a venue manager")}
        
        let availableSeats = await getAvailableSeats(event.showName, event.orderBy)
        
        response = {
            statusCode: 200,
            availableSeats
        }
    }
    catch (err) {
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
