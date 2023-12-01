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

    let isShowInactive = (showName) => {
        return new Promise((resolve, reject) => {
            // delete from database
            pool.query("SELECT * FROM seats4u.Shows WHERE showName=? AND isShowActive=0", [showName], (error, rows) => {
                if (error) { return reject(error); }
                let showInactive = rows.length > 0;
                return resolve(showInactive)
            });
        });
    }
    
    let doesShowExist = (showName) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Shows WHERE showName=?", [showName], (error, rows) => {
                if (error) { return reject(error); }
                let showExists = rows.length > 0;
                return resolve(showExists)
            });
        });
    }

    let deleteShowfromDatabase = (showName) => {
        return new Promise((resolve, reject) => {
            // delete from database
            pool.query("DELETE FROM seats4u.Shows WHERE showName=?", [showName], (error, rows) => {
                if (error) { return reject(error); }
                return resolve()
            });
        });
    }

    let response = undefined
    try {
        let authorizedAsAdministrator = await isAuthorizedAsAdministrator(event.userID)
        if(authorizedAsAdministrator){
            let showExists = await doesShowExist(event.showName);
            if(showExists){
                let deleteShow = await deleteShowfromDatabase(event.showName);
            
                response = {
                    statusCode: 200
                }
            }
            else{
                response = {
                    statusCode: 400,
                    error: "Show not found"
                }
            }
        }
        else{
            let authorizedAsVenueManager = await isAuthorizedAsVenueManager(event.userID)
            if(authorizedAsVenueManager){
                let showExists = await doesShowExist(event.showName);
                if(showExists){
                    let showInactive = await isShowInactive(event.showName)
                    if(!showInactive) {
                        let deleteShow = await deleteShowfromDatabase(event.showName)
                    
                        response = {
                            statusCode: 200
                        }
                    }
                    else{
                        response = {
                            statusCode: 400,
                            error: "Venue manager cannot delete an active show"
                        }
                    }
                }
                else {
                    response = {
                        statusCode: 400,
                        error: "Show not found"
                    }
                }
            }
            response = {
                statusCode: 400,
                error: "User is not authorized to perform this action"
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
