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

    let getShowsFromDatabase = (venueID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT showName, isShowActive, showID, showDatetime FROM seats4u.Shows WHERE venueID=? ORDER BY showDatetime", [venueID], (error, rows) => {
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
            let shows = await getShowsFromDatabase(event.userID)

            response = {
                statusCode: 200,
                shows
            }
        }
        else{
            response = {
                statusCode: 400,
                error: "Venue ID not recognized"
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
