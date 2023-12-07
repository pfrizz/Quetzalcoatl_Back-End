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

    let isShowInactive = (showID) => {
        return new Promise((resolve, reject) => {
            // delete from database
            pool.query("SELECT * FROM seats4u.Shows WHERE showID=? AND isShowActive=0", [showID], (error, rows) => {
                if (error) { return reject(error); }
                let showInactive = rows.length > 0;
                return resolve(showInactive)
            });
        });
    }
    
    let doesShowExist = (showID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Shows WHERE showID=?", [showID], (error, rows) => {
                if (error) { return reject(error); }
                let showExists = rows.length > 0;
                return resolve(showExists)
            });
        });
    }

    let deleteShowfromDatabase = (showID) => {
        return new Promise((resolve, reject) => {
            // delete from database
            pool.query("DELETE FROM seats4u.Shows WHERE showID=?", [showID], (error, rows) => {
                if (error) { return reject(error); }
                return resolve()
            });
        });
    }

    let response = undefined
    try {
        let authorizedAsAdministrator = await isAuthorizedAsAdministrator(event.userID)
        if(authorizedAsAdministrator){
            if(!await doesShowExist(event.showID)) {throw("Show with id '" + event.showID + "' not found")}

            await deleteShowfromDatabase(event.showID);
        
            response = {
                statusCode: 200
            }
        }
        else{
            if(!await isAuthorizedAsVenueManager(event.userID)){ throw ("User is not authorized to perform this action") }
            if(!await doesShowExist(event.showID)) {throw("Show with id '" + event.showID + "' not found")}
            if(!await isShowInactive(event.showID)) { throw ("Venue manager cannot delete an active show") }
            
            await deleteShowfromDatabase(event.showID)
        
            response = {
                statusCode: 200
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
