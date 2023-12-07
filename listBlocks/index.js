const mysql = require('/opt/nodejs/node_modules/mysql');
const db_access = require('/opt/nodejs/db_access')
const { v4: uuidv4 } = require('/opt/nodejs/node_modules/uuid');

exports.handler = async (event) => {
    console.log("SDDSD")
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
    
    let getShownameFromDatabase = (showName) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT showID FROM seats4u.Shows where showName=?",[showName], (error, rows) => {
                if (error) { return reject(error); }
                console.log(rows[0])
                let showID = rows[0];

                return resolve(rows[0].showID)
                
            });
        });
    }

console.log("SDS")
    let getBlocksFromDatabase = (showID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT price, startingRow, endingRow FROM seats4u.Blocks where showID=?",[showID], (error, rows) => {
                if (error) { return reject(error); }
                if(rows.length > 0){
                    return resolve(rows)
                }
                else{
                    return resolve([])
                }
            });
        });
    }
    
    let response = undefined
    try {
        let isAuthorized = await isAuthorizedAsVenueManager(event.userID)
        
        if(isAuthorized) {
            let showId = await getShownameFromDatabase(event.showName)
            let block = await getBlocksFromDatabase(showId)
            response = {
                statusCode: 200,
                block
            }
        }
        else{
            response = {
                statusCode: 400,
                error: "User is not authorized as administrator"
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
