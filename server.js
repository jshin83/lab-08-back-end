'use strict';

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');
let locationId;

// Load environment variables from .env file
require('dotenv').config();

// Application Setup
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Database Setup
//            postgres protocol
//                            my uname/pw           domain : port/database
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();

// API Routes
app.get('/location', (request, response) => {
  searchToLatLong(request.query.data)
    .then(location => response.send(location))
    .catch(error => handleError(error, response));
});

app.get('/weather', getWeather);
app.get('/events', getEvents);


// Make sure the server is listening for requests
app.listen(PORT, () => console.log(`Listening on ${PORT}`));

// Error handler
function handleError(err, res) {
  console.error(err);
  if (res) res.status(500).send('Sorry, something went wrong');
}

// Models
function Location(query, res) {
  this.search_query = query;
  this.formatted_query = res.body.results[0].formatted_address;
  this.latitude = res.body.results[0].geometry.location.lat;
  this.longitude = res.body.results[0].geometry.location.lng;
}

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
}

function Event(event) {
  this.link = event.url;
  this.name = event.name.text;
  this.event_date = new Date(event.start.local).toDateString();
  this.summary = event.summary;
}

function searchToLatLong(query) {
  // check if query in database
  let sqlStatement = 'SELECT * FROM location WHERE search_query = $1;';
  let values = [ query ];
  return client.query(sqlStatement, values)
    .then( (data) => {
      // if data in db, use data from db and send result
      if(data.rowCount > 0) {
        // use data from db and send result
        // save id to look at other tables, query db to look at weather and event tables
        return data.rows[0];
      } else {
        // otherwise, grab data from gmaps, save to db, and send result
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;

        return superagent.get(url)
          .then(res => {
            let newLocation = new Location(query, res);
            let locationInsertStatement = 'INSERT INTO location ( search_query, formatted_query, latitude, longitude ) VALUES ( $1, $2, $3, $4 ) RETURNING id;';
            let insertValues = [ newLocation.search_query, newLocation.formatted_query, newLocation.latitude, newLocation.longitude ];
            client.query(locationInsertStatement, insertValues)
              .then(result => {
                console.log('result', result);
                locationId = result.rows[0].id;
              });
            //insert to event
            return newLocation;
          })
          .catch(error => handleError(error));
      }
    });
}

//helper function to save query to tables
function saveToTables(statement, insertValues) {
  client.query(statement, insertValues);
}

function getWeather(request, response) {
  const url = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

  superagent.get(url)
    .then(result => {
      //put into db if new
      const weatherSummaries = result.body.daily.data.map(day => {
        let newWeather = new Weather(day);
        saveToTables('INSERT INTO weather ( location_id, forecast, time_string ) VALUES ( $1, $2, $3 )', [ locationId, newWeather.forecast, newWeather.time ]);
        // let weatherStatement = 'INSERT INTO weather ( location_id, forecast, time_string ) VALUES ( $1, $2, $3 )';
        // let insertValues = [ locationId, newWeather.forecast, newWeather.time ];
        // client.query(weatherStatement, insertValues);
        return newWeather;
      });

      response.send(weatherSummaries);
    })
    .catch(error => handleError(error, response));
}


function getEvents(request, response) {
  const url = `https://www.eventbriteapi.com/v3/events/search?location.longitude=${request.query.data.longitude}&location.latitude=${request.query.data.latitude}&expand=venue&token=${process.env.EVENTBRITE_API_KEY}`;

  superagent.get(url)
    .then(result => {
      //put into db if new
      const events = result.body.events.map(eventData => {
        let newEvent = new Event(eventData);
        saveToTables('INSERT INTO event ( location_id, link, event_name, event_date, summary ) VALUES ( $1, $2, $3, $4, $5 )', [ locationId, newEvent.link, newEvent.name, newEvent.event_date, newEvent.summary ]);
        // let eventStatement = 'INSERT INTO event ( location_id, link, event_name, event_date, summary ) VALUES ( $1, $2, $3, $4, $5 )';
        // let insertValues = [ locationId, newEvent.link, newEvent.name, newEvent.event_date, newEvent.summary ];
        // client.query(eventStatement, insertValues);
        return newEvent;
      });

      response.send(events);
    })
    .catch(error => handleError(error, response));
}
