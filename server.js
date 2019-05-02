'use strict';

require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const superagent = require('superagent');

// Variable for holding current location
// use environment variable, or, if it's undefined, use 3000 by default
const PORT = process.env.PORT || 3000;

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
  try {
    // queryData is what the user typed into the box in the FE and hit "explore"
    const queryData = request.query.data;

    let geocodeURL = `https://maps.googleapis.com/maps/api/geocode/json?address=${queryData}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    superagent.get(geocodeURL).end( (err, googleMapsApiResponse) => {
      const location = new Location(queryData, googleMapsApiResponse.body);

      response.send(location);
    });
  } catch( error ) {
    errorHandling(error, 500, response);
  }
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

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
