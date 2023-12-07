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
    
      let isAuthorizedAsVenueManager = (userID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Venues WHERE venueID=?", [userID], (error, rows) => {
                if (error) { return reject(error); }
                let isAuthorized = rows.length > 0;
                return resolve(isAuthorized)
            });
        });
    }
    
        let deleteBlockfromDatabase = (blockID) => {
        return new Promise((resolve, reject) => {
            // delete from database
            pool.query("DELETE FROM seats4u.Blocks WHERE blockID=?", [blockID], (error, rows) => {
                if (error) { return reject(error); }
                //on success return the venue ID
                return resolve(blockID)
            });
        });
    }
    
      let response = undefined
    try {
        let isAuthorized = await isAuthorizedAsVenueManager(event.userID)
        if(isAuthorized){
            let blockID = await deleteBlockfromDatabase(event.blockID)
            
            response = {
                statusCode: 200
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
