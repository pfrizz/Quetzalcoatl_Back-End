const mysql = require('mysql');
const db_access = require('/opt/nodejs/db_access')
const { v4: uuidv4 } = require('uuid');

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

    let getVenueNameFromDatabase = (venueID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT venueName FROM seats4u.Venues WHERE venueID=?", [venueID], (error, rows) => {
                if (error) { return reject(error); }
                return resolve(JSON.parse(JSON.stringify(rows[0].venueName)))
            });
        });
    }
    
    let getVenueSectionsFromDatabase = (venueID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT sectionType, numberOfRows, numberOfColumns FROM seats4u.Sections WHERE venueID=?", [venueID], (error, rows) => {
                if (error) { return reject(error); }
                return resolve(rows)
            });
        });
    }
    
    let response = undefined
    try {
        let isAuthorized = await isAuthorizedAsVenueManager(event.userID)
        
        if(isAuthorized) {
            let venueName = await getVenueNameFromDatabase(event.userID)
            let sections = await getVenueSectionsFromDatabase(event.userID)

            response = {
                statusCode: 200,
                venueName,
                sections
            }
        }
        else{
            response = {
                statusCode: 400,
                error: "User is not authorized as venue manager"
            }
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
