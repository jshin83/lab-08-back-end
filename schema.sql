
DROP TABLE IF EXISTS weather;
DROP TABLE IF EXISTS event;
DROP TABLE IF EXISTS location;

CREATE TABLE location (
  id SERIAL PRIMARY KEY,
  latitude NUMERIC,
  longitude NUMERIC,
  formatted_query VARCHAR(255),
  search_query VARCHAR(255)
);

CREATE TABLE weather (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  time VARCHAR(50), 
  location_id INTEGER NOT NULL REFERENCES location(id)
);

CREATE TABLE event (
  id SERIAL PRIMARY KEY,
  link VARCHAR(255),
  name VARCHAR(255),
  event_date VARCHAR(25),
  summary VARCHAR(555), 
  location_id INTEGER NOT NULL REFERENCES location(id)
);
