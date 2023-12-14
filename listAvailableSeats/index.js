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
    
    let doesShowExist = (showID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Shows WHERE showID=?", [showID], (error, rows) => {
                if (error) { return reject(error); }
                let doesExist = rows.length > 0;
                return resolve(doesExist)
            });
        });
    }
    
    let isShowInPast = (showID) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT * FROM seats4u.Shows WHERE showID=? AND showDatetime < CONVERT_TZ(NOW(), 'UTC', 'US/Eastern')", [showID], (error, rows) => {
                if (error) { return reject(error); }
                let isInPast = rows.length > 0;
                return resolve(isInPast)
            });
        });
    }

    let getAvailableSeatsBySeatRow = (showID) => {
        return new Promise((resolve, reject) => {
            pool.query("CALL `seats4u`.`getAvailableSeatsBySeatRow`(?)", [showID], (error, rows) => {
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
    
    let getAvailableSeatsBySeatColumn = (showID) => {
        return new Promise((resolve, reject) => {
            pool.query("CALL `seats4u`.`getAvailableSeatsBySeatColumn`(?)", [showID], (error, rows) => {
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
    
    let getAvailableSeatsByPrice = (showID) => {
        return new Promise((resolve, reject) => {
            pool.query("CALL `seats4u`.`getAvailableSeatsByPrice`(?)", [showID], (error, rows) => {
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
    
    let getAvailableSeatsBySectionType = (showID) => {
        return new Promise((resolve, reject) => {
            pool.query("CALL `seats4u`.`getAvailableSeatsBySectionType`(?)", [showID], (error, rows) => {
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
        if(event.showID == null) {throw("Key 'showID' is required")}
        if(!await doesShowExist(event.showID)) {throw("Show with id '" + event.showID + "' does not exist")}
        if(await isShowInPast(event.showID)) {throw("Show has already started and tickets cannot be bought for it")}
        
        let availableSeats = null;
        if(event.orderBy === "seatRow"){
            availableSeats = await getAvailableSeatsBySeatRow(event.showID)
        }
        else if(event.orderBy === "seatColumn"){
            availableSeats = await getAvailableSeatsBySeatColumn(event.showID)
        }
        else if(event.orderBy === "price"){
            availableSeats = await getAvailableSeatsByPrice(event.showID)
        }
        else if(event.orderBy === "sectionType"){
            availableSeats = await getAvailableSeatsBySectionType(event.showID)
        }
        else{
            throw ("Invalid sorting criteria, must be one of 'seatRow', 'seatColumn', 'price', or 'sectionType'")
        }
        
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
