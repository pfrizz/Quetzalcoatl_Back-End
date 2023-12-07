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

    let addBlockToDatabase = (showID, sectionID, price, startingRow, endingRow) => {
        return new Promise((resolve, reject) => {
            // generate new uuid for the show
            let blockID = uuidv4();

            // insert show into database
            pool.query("INSERT INTO seats4u.Blocks VALUES (?, ?, ?, ?, ?,?)", [blockID,showID ,sectionID, price, startingRow, endingRow], (error, rows) => {
                if (error) { return reject(error); }
                return resolve(blockID)
            });
        });
    }

    let validateBlockRows = (startingRow,endingRow) =>{
        let startCharCode = startingRow.toUpperCase().charCodeAt(0);
        let endCharCode = endingRow.toUpperCase().charCodeAt(0);
        
        console.log(startCharCode + " " + endCharCode)
          
            if (startCharCode < 65 || startCharCode > 90 || endCharCode < 65 || endCharCode > 90 || startCharCode > endCharCode) {
        return false;
    }
    return true;
    };

    let validateBlockPrice = (price) => {
    const maxPrice = 99999999.99;
    if (typeof price !== 'number' || price <= 0 || price > maxPrice) {
        return false;
    }
    return true;
};
    
    
    let getNumberOfBlockColumns = (blockID) => {
        return new Promise((resolve, reject) => {
            let numberOfBlockColumns = 0;
            pool.query("CALL getNumberOfBlockColumns(?)", [blockID], (error,result) => {
                if (error) {return reject(error); }
                numberOfBlockColumns = result[0][0].numberOfColumns;
                return resolve(numberOfBlockColumns);
            });
        });
    };
    
    let addSeatToDatabase = (blockID, seatRow, seatColumn) => {
        return new Promise((resolve, reject) => {
            let seatID = uuidv4();
            
            pool.query("INSERT INTO seats4u.Seats VALUES (?, ? , ?, ?, ?, NULL)", [seatID, blockID, seatRow, seatColumn, "AVAILABLE"], (error,result) => {
                if (error) {return reject(error); }
                return resolve(seatID);
            });
        });
    };

    let response = undefined
    try {
        let isAuthorized = await isAuthorizedAsVenueManager(event.userID)
        if(isAuthorized){
        console.log("this work part 1")
              if (!validateBlockRows(event.startingRow, event.endingRow)) {
                throw ('Invalid block rows');
            }
            
             console.log("this works")
                if (!validateBlockPrice(event.price)) {
                throw ('Invalid block price');
            }
            
            console.log(event.price)
            
                let blockID = await addBlockToDatabase(event.showID, 
                                                        event.sectionID, 
                                                        event.price, 
                                                        event.startingRow, 
                                                        event.endingRow);
                console.log("this also works")
                                                        
                // add all of the block's seats to the database
                let numberOfRows = event.endingRow.charCodeAt(0) - event.startingRow.charCodeAt(0) + 1;
                let numberOfColumns = await getNumberOfBlockColumns(blockID);
                console.log(numberOfColumns)
                for (let j = 0; j < numberOfRows; j++){
                    for(let k = 0; k < numberOfColumns; k++){
                        let seatRow = String.fromCharCode(event.startingRow.charCodeAt(0) + j);
                        // seat columns are 1-indexed
                        let seatColumn = k + 1;
                        let seatID = await addSeatToDatabase(blockID, seatRow, seatColumn);
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
