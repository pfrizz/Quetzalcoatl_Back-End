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
    
    let doesSeatExist = (seatID) => {
      return new Promise((resolve, reject) => {
          pool.query("SELECT * FROM seats4u.Seats WHERE seatID=?", [seatID], (error, rows) => {
              if (error) { return reject(error); }
              let doesExist = rows.length > 0;
              return resolve(doesExist)
          });
      });
    }
        
    let isSeatAvailable = (seatID) => {
      return new Promise((resolve, reject) => {
          pool.query("SELECT * FROM seats4u.Seats WHERE seatID=? AND seatState='AVAILABLE'", [seatID], (error, rows) => {
              if (error) { return reject(error); }
              let isAvailable = rows.length > 0;
              return resolve(isAvailable)
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
    
    let buySeat = (seatID) => {
      return new Promise((resolve, reject) => {
          pool.query("UPDATE seats4u.Seats SET seatState='SOLD' WHERE seatID=?", [seatID], (error, rows) => {
              if (error) { return reject(error); }
              return resolve()
          });
      });
    }
    
    let response = undefined
    try {
      if(await isShowInPast(event.showID)) {throw("Show is in the past and seats cannot be bought")}
        if(event.selectedSeats == null) {throw("Key 'selectedSeats' is required")}
        
        // error check all seats before buying
        for(let i = 0; i < event.selectedSeats.length; i++){
          if(!await doesSeatExist(event.selectedSeats[i].seatID)) {
            throw("Seat with ID '" + event.selectedSeats[i].seatID + "' does not exist")
          }
          if(!await isSeatAvailable(event.selectedSeats[i].seatID)) {
            throw("Seat with ID '" + event.selectedSeats[i].seatID + "' is not available")
          }
        }
        
        //buy each seat
        for(let i = 0; i < event.selectedSeats.length; i++){
          await buySeat(event.selectedSeats[i].seatID)
        }
        
        response = {
            statusCode: 200
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
