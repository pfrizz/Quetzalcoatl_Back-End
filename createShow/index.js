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

    let addShowToDatabase = (venueID, showName, isShowActive, showDatetime) => {
        return new Promise((resolve, reject) => {
            // generate new uuid for the show
            let showID = uuidv4();

            // insert show into database
            pool.query("INSERT INTO seats4u.Shows VALUES (?, ?, ?, ?, ?)", [showID, venueID, showName, isShowActive, showDatetime], (error, rows) => {
                if (error) { return reject(error); }
                return resolve(showID)
            });
        });
    }

    
    let addBlockToDatabase = (showName, venueID, sectionType, price, startingRow, endingRow) => {
        return new Promise((resolve, reject) => {
            // generate new uuid for the block
            let blockID = uuidv4();

            // call stored procedure to add block to database
            pool.query("CALL addBlockToDatabase(?, ?, ?, ?, ?, ?, ?)", [showName, venueID, sectionType, blockID, price, startingRow, endingRow], (error, rows) => {
                if (error) { return reject(error); }
                return resolve(blockID)
            });
        });
    }
    
    let getNumberOfBlockColumns = (blockID) => {
        return new Promise((resolve, reject) => {
            let numberOfBlockColumns = 0;
            pool.query("CALL getNumberOfBlockColumns(?)", [blockID], (error,result) => {
                if (error) {return reject(error); }
                numberOfBlockColumns = result[0][0].numberOfColumns;
                return resolve(numberOfBlockColumns);
            });
        });
    }
    
    let addSeatToDatabase = (blockID, seatRow, seatColumn) => {
        return new Promise((resolve, reject) => {
            let seatID = uuidv4();
            
            pool.query("INSERT INTO seats4u.Seats VALUES (?, ? , ?, ?, ?)", [seatID, blockID, seatRow, seatColumn, "AVAILABLE"], (error,result) => {
                if (error) {return reject(error); }
                return resolve(seatID);
            });
        });
    }

    let response = undefined
    try {
        let isAuthorized = await isAuthorizedAsVenueManager(event.userID)
        if(isAuthorized){
            // generate the showID and add it to the database
            let showID = await addShowToDatabase(event.userID, event.showName, false, event.showDatetime)
            
            // add all of the show's blocks to the database
            for (let i = 0; i < event.blocks.length; i++) {
                let blockID = await addBlockToDatabase(event.showName, 
                                                        event.userID, 
                                                        event.blocks[i].sectionType, 
                                                        event.blocks[i].price, 
                                                        event.blocks[i].startingRow, 
                                                        event.blocks[i].endingRow);
                                                        
                // add all of the block's seats to the database
                let numberOfRows = event.blocks[i].endingRow.charCodeAt(0) - event.blocks[i].startingRow.charCodeAt(0) + 1;
                let numberOfColumns = await getNumberOfBlockColumns(blockID);
                
                for (let j = 0; j < numberOfRows; j++){
                    for(let k = 0; k < numberOfColumns; k++){
                        let seatRow = String.fromCharCode(event.blocks[i].startingRow.charCodeAt(0) + j);
                        // seat columns are 1-indexed
                        let seatColumn = k + 1;
                        let seatID = await addSeatToDatabase(blockID, seatRow, seatColumn);
                    }
                }
            }
    
            response = {
                statusCode: 200,
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
