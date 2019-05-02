
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
  location_id VARCHAR(255),
  forecast VARCHAR(255),
  time_string VARCHAR(50)
);

CREATE TABLE event (
  id SERIAL PRIMARY KEY,
  location_id VARCHAR(255),
  link VARCHAR(255),
  event_name VARCHAR(255),
  event_date VARCHAR(25),
  summary TEXT
);
