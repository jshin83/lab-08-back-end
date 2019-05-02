'use strict';

require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

// Variable for holding current location
// use environment variable, or, if it's undefined, use 3000 by default
const PORT = process.env.PORT || 3000;
const client = new pg.Client(process.env.DATABASE_URL);

//static files
app.use(cors());

// Constructor for the Location response from API
const Location = function(query, res){
  this.search_query = query;
  this.formatted_query = res.results[0].formatted_address;
  this.latitude = res.results[0].geometry.location.lat;
  this.longitude = res.results[0].geometry.location.lng;
};

// Constructor for a DaysWeather.
const DaysWeather = function(forecast, time){
  this.forecast = forecast;
  this.time = new Date(time * 1000).toDateString();
};

//Constructor for eventInstance
const Event = function(res) {
  this.link = res.url;
  this.name = res.name.text;
  this.event_date = new Date(res.start.utc).toDateString();
  this.summary = res.summary;
};

//routes
app.get('/location', (request, response) => {

  // queryData is what the user typed into the box in the FE and hit "explore"
  const queryData = request.query.data;
  searchToLatLong(queryData).then(location => response.send(location)).catch(error => handleError(error, response));
});

//route for weather daily data
app.get('/weather', (request, response) => {
  try {
    let darkskyURL = `https://api.darksky.net/forecast/${process.env.DARK_SKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

    superagent.get(darkskyURL).end((err, weatherApiResponse) => {
      response.send(getDailyWeather(weatherApiResponse.body));
    });
  } catch( error ) {
    errorHandling(error, 500, response);
  }
});

//route for eventbrite
app.get('/events', (request, response) => {
  try {
    let eventsURL = `https://www.eventbriteapi.com/v3/events/search?location.longitude=${request.query.data.longitude}&location.latitude=${request.query.data.latitude}&expand=venue&token=${process.env.EVENTBRITE_API_KEY}`;

    superagent.get(eventsURL).end((err, eventsApiResponse) => {
      //console.log(processEvents(eventsApiResponse.body.events.slice(0, 21)));
      response.send(processEvents(eventsApiResponse.body.events.slice(0, 21)));
    });
  } catch( error ) {
    errorHandling(error, 500, response);
  }
});

function searchToLatLong(query) {
  // check if query in database
  let sqlStatement = 'SELECT * FROM location WHERE search_query = $1;';
  let values = [ query ];
  return client.query(sqlStatement, values)
    .then( (data) => {
      console.log('we made it');
      console.log(data);
      // if data in db, use data from db and send result
      if(data.rowCount > 0) {
        // use data from db and send result
        console.log('we are sending data from the database');
        return data.rows[0];
      } else {
        // otherwise, grab data from gmaps, save to db, and send result
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;

        return superagent.get(url)
          .then(res => {
            let newLocation = new Location(query, res);
            let insertStatement = 'INSERT INTO location ( search_query, formatted_query, latitude, longitude ) VALUES ( $1, $2, $3, $4 );';
            let insertValues = [ newLocation.search_query, newLocation.formatted_query, newLocation.latitude, newLocation.longitude ];
            client.query(insertStatement, insertValues);
            return newLocation;
          })
          .catch(error => handleError(error));
      }
    });
}

// Function for getting all the daily weather
function getDailyWeather(weatherData){
  let weatherArr = weatherData.daily.data;
  return weatherArr.map(day => {
    return new DaysWeather(day.summary, day.time);
  });
}

// Function for handling errors
function errorHandling(error, status, response){
  response.status(status).send('Sorry, something went wrong');
}

// helper to process events
function processEvents(eventsData) {
  return eventsData.map( event => {
    return new Event(event);
  });
}

//handler for errors
function handleError(err, res) {
  console.error(err);
  if (res) res.status(500).send('Sorry, something went wrong');
}

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
