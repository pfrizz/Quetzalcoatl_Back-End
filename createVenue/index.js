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

    let addVenueToDatabase = (venueName) => {
        return new Promise((resolve, reject) => {
            // generate new uuid for the venue
            let venueID = uuidv4();

            // insert into database
            pool.query("INSERT INTO seats4u.Venues VALUES (?, ?)", [venueID, venueName], (error, rows) => {
                if (error) { return reject(error); }
                //on success return the venue ID
                return resolve(venueID)
            });
        });
    }
    
    let addSectionToDatabase = (venueID, sectionType, numberOfRows, numberOfColumns) => {
        return new Promise((resolve, reject) => {
            // generate new uuid for the section
            let sectionID = uuidv4();

            // insert into database
            pool.query("INSERT INTO seats4u.Sections VALUES (?, ?, ?, ?, ?)", [sectionID, venueID, sectionType, numberOfRows, numberOfColumns], (error, rows) => {
                if (error) { return reject(error); }
                //on success return the section ID
                return resolve(sectionID)
            });
        });
    }

    let response = undefined
    try {
        let venueID = await addVenueToDatabase(event.venueName)
        for (let i = 0; i < event.sections.length; i++) {
            let sectionID = await addSectionToDatabase(venueID, event.sections[i].sectionType, event.sections[i].numberOfRows, event.sections[i].numberOfColumns)
        }

        response = {
            statusCode: 200,
            venueID: venueID
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
