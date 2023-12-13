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

    
    let addBlockToDatabase = (showID, venueID, sectionType, price, startingRow, endingRow) => {
        return new Promise((resolve, reject) => {
            // generate new uuid for the block
            let blockID = uuidv4();

            // call stored procedure to add block to database
            pool.query("CALL addBlockToDatabase(?, ?, ?, ?, ?, ?, ?)", [showID, venueID, sectionType, blockID, price, startingRow, endingRow], (error, rows) => {
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

    // now all seats are added in one batch statement, rather than making a bunch of individual connections
    let addSeatsToDatabase = (seats) => {
        return new Promise((resolve, reject) => {
            pool.query("INSERT INTO seats4u.Seats VALUES ?", [seats], (error,result) => {
                if (error) {return reject(error); }
                return resolve();
            });
        });
    }
    
    let getSectionRowCount = (venueID, sectionType) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT numberOfRows FROM Venues INNER JOIN Sections ON Venues.venueID = Sections.venueID WHERE Sections.venueID=? AND sectionType=?", 
             [venueID, sectionType], (error,result) => {
                if (error) {return reject(error); }
                let numberOfRows = result[0].numberOfRows
                return resolve(numberOfRows);
            });
        });
    }
    
    let charToIndex = (charCode) => {
        console.log(charCode)
        return charCode-65
    }

    let response = undefined
    try {
        //--------------------- error checking begins --------------------------
        if(!await isAuthorizedAsVenueManager(event.userID)) { throw ("User is not authorized as venue manager") }
        
        // check that block bounds are valid

        let sideLeftRowsFilled =Array(await getSectionRowCount(event.userID, "SIDELEFT")).fill(false)
        let centerRowsFilled =Array(await getSectionRowCount(event.userID, "CENTER")).fill(false)
        let sideRightRowsFilled =Array(await getSectionRowCount(event.userID, "SIDERIGHT")).fill(false)
        for (let i = 0; i < event.blocks.length; i++) {
            let sectionRowCount = await getSectionRowCount(event.userID, event.blocks[i].sectionType)
            let startingRow = charToIndex(event.blocks[i].startingRow.charCodeAt(0))
            let endingRow = charToIndex(event.blocks[i].endingRow.charCodeAt(0))
            
            // check that ending row is not before starting row
            if(endingRow < startingRow){
                throw ("Block ending row is before starting row")
            }
            
            // check that starting row is within bounds of section
            if(startingRow > sectionRowCount) {
                throw ("Block start is not within bounds of venue section")
            }
            
            // check that ending row is within bounds of section
            if(endingRow > sectionRowCount) {
                throw ("Block end is not within bounds of venue section")
            }
            
            // mark off the rows this block covered and check for overlap
            if(event.blocks[i].sectionType === "SIDELEFT"){
                for(let j = startingRow; j < endingRow + 1; j++) {
                    if(sideLeftRowsFilled[j] == true){
                        throw ("Blocks overlap on at least one row in side left section")
                    }
                    sideLeftRowsFilled[j] = true;
                }
            }
            else if(event.blocks[i].sectionType === "CENTER"){
                for(let j = startingRow; j < endingRow + 1; j++) {
                    if(centerRowsFilled[j] == true){
                        throw ("Blocks overlap on at least one row in center section")
                    }
                    centerRowsFilled[j] = true;
                }
            }
            else if(event.blocks[i].sectionType === "SIDERIGHT"){
                for(let j = startingRow; j < endingRow + 1; j++) {
                    if(sideRightRowsFilled[j] == true){
                        throw ("Blocks overlap on at least one row in side right section")
                    }
                    sideRightRowsFilled[j] = true;
                }
            }
        }
        
        // check that all rows in all sections are covered
        if(sideLeftRowsFilled.includes(false) || centerRowsFilled.includes(false) || sideRightRowsFilled.includes(false)) {
            throw("Blocks do not fill all seats in the venue")
        }
        //---------------------- error checking ends ---------------------------
        
        
        
        // generate the showID and add it to the database
        let showID = await addShowToDatabase(event.userID, event.showName, false, event.showDatetime)
        
        // add all of the show's blocks to the database
        for (let i = 0; i < event.blocks.length; i++) {
            let blockID = await addBlockToDatabase(showID, 
                                                    event.userID, 
                                                    event.blocks[i].sectionType, 
                                                    event.blocks[i].price, 
                                                    event.blocks[i].startingRow, 
                                                    event.blocks[i].endingRow);
                                                    
            let numberOfRows = event.blocks[i].endingRow.charCodeAt(0) - event.blocks[i].startingRow.charCodeAt(0) + 1;
            let numberOfColumns = await getNumberOfBlockColumns(blockID);

            //array of seats to be added in batch query
            let seats = []
            for (let j = 0; j < numberOfRows; j++){
                for(let k = 0; k < numberOfColumns; k++){
                    let seatID = uuidv4();
                    let seatRow = String.fromCharCode(event.blocks[i].startingRow.charCodeAt(0) + j);
                    // seat columns are 1-indexed
                    let seatColumn = k + 1;
                    
                    seats.push([seatID, blockID, seatRow, seatColumn, "AVAILABLE"])
                }
            }

            await addSeatsToDatabase(seats);
        }
        
        
        response = {
            statusCode: 200,
            showID
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
