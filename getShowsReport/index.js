const mysql = require('/opt/nodejs/node_modules/mysql');
const db_access = require('/opt/nodejs/db_access')
const { v4: uuidv4 } = require('/opt/nodejs/node_modules/uuid');

exports.handler = async (event) => {
    // get credentials from the db_access layer (loaded separately via AWS console)
    var pool = mysql.createPool({
        host: db_access.config.host,
        user: db_access.config.user,
        password: db_access.config.password,
        database: db_access.config.database
    });
    
    let isAuthorizedAsAdministrator = (userID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Administrators WHERE administratorID=?", [userID], (error, rows) => {
                if (error) { return reject(error); }
                let isAuthorized = rows.length > 0;
                return resolve(isAuthorized)
            });
        });
    }
    
    let isAuthorizedAsVenueManager = (userID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Venues WHERE venueID=?", [userID], (error, rows) => {
                if (error) { return reject(error); }
                let isAuthorized = rows.length > 0;
                return resolve(isAuthorized)
            });
        });
    }
    
    let doesVenueExist = (venueID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Venues WHERE venueID=?", [venueID], (error, rows) => {
                if (error) { return reject(error); }
                let venueExists = rows.length > 0;
                return resolve(venueExists)
            });
        });
    }
    

    let getShowsReport = (venueID) => {
        return new Promise((resolve, reject) => {
            pool.query("CALL `seats4u`.`generateShowsReport`(?)", [venueID], (error, rows) => {
                if (error) { return reject(error); }
                if(rows.length > 0){
                  return resolve(rows[0])
                }
                else{
                  return resolve([])
                }
            });
        });
    }
    
    
    let response = undefined
    try {
        let hasAdministratorAuthentication = await isAuthorizedAsAdministrator(event.userID)
        let hasVenueManagerAuthorization = await isAuthorizedAsVenueManager(event.userID)
        
        if(!hasAdministratorAuthentication && !hasVenueManagerAuthorization) {throw ("User is not authorized to perform this action")}
        
        let venueID = hasAdministratorAuthentication ? event.venueID : event.userID;
        
        let venueExists = await doesVenueExist(venueID)
        if (!venueExists) {throw ("Venue not found")}
          
        let showsReport = await getShowsReport(venueID)

        response = {
            statusCode: 200,
            showsReport
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
