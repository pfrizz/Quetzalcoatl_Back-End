const mysql = require('/opt/nodejs/node_modules/mysql');
const db_access = require('/opt/nodejs/db_access');

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

    let activateShow = (showName) => {
        return new Promise((resolve, reject) => {
            pool.query("UPDATE seats4u.Shows SET isShowActive=1 WHERE showName=?", [showName], (error, rows) => {
                if (error) { return reject(error); }
                return resolve()
            });
        });
    }


    let response = undefined
    try {
        let isAuthorized = await isAuthorizedAsVenueManager(event.userID)
        if(isAuthorized){
            await activateShow(event.showName);

            response = {
                statusCode: 200
            }
        }
        else{
            throw ("User is not authorized as a venue manager")
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
