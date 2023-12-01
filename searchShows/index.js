const db_access = require('/opt/nodejs/db_access')
const mysql = require('/opt/nodejs/node_modules/mysql');
const { v4: uuidv4 } = require('/opt/nodejs/node_modules/uuid');

exports.handler = async (event) => {
    // get credentials from the db_access layer (loaded separately via AWS console)
    var pool = mysql.createPool({
        host: db_access.config.host,
        user: db_access.config.user,
        password: db_access.config.password,
        database: db_access.config.database
    });

    let searchActiveShowsByShowName = (query) => {
        return new Promise((resolve, reject) => {
            pool.query("CALL `seats4u`.`searchActiveShowsByShowName`(?);", [query], (error, rows) => {
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
    
    let searchActiveShowsByVenueName = (query) => {
        return new Promise((resolve, reject) => {
            pool.query("CALL `seats4u`.`searchActiveShowsByVenueName`(?);", [query], (error, rows) => {
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
        if(event.queryType === "showName"){
            let result = await searchActiveShowsByShowName(event.query)
            
            response = {
                statusCode: 200,
                result
            }
        }
        else if(event.queryType === "venueName"){
            let result = await searchActiveShowsByVenueName(event.query)
            
            response = {
                statusCode: 200,
                result
            }
        }
        else{
            response = {
                statusCode: 400,
                error: "Invalid query type"
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
