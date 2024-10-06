/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/


const express = require('express')
const bodyParser = require('body-parser')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')

// declare a new express app
const app = express()
app.use(bodyParser.json())
app.use(awsServerlessExpressMiddleware.eventContext())

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "*")
  next()
});


/**********************
 * Example get method *
 **********************/

app.get('/transitrout', async function (req, res) { // make the function async
  try {
    const start = req.query.startpoint;
    const end = req.query.endpoint;
    const time = req.query.time;
    const userAgent = req.headers['user-agent'];

    const url = "https://vk9hc6kko2.execute-api.us-west-2.amazonaws.com/prod/invoke-model";

    const messageContent = `please find a public transit route from ${start} to ${end} at ${time}. Please find the fastest one.
      Please give the answer in the following format, do not include any other text::
      {
        Estimated trip time: number, // total travel time in minutes
        Departure time: HH:MM, // time of departure
        Arrival time: HH:MM, // estimated time of arrival
        Carbon footprint (kg): number, // carbon emission in kilograms
        route: [
            {
                bus line: string, // bus line number or name
                start station: string, // name of start station
                end station: string // name of end station
            },
            as many as necessary
        ],
        geojson line: {} // GeoJSON object representing the route path
      }`;

    let response = null;
    try {
      response = await fetch(url, {
        method: 'POST',  // Specify the method as POST
        headers: {
          'Content-Type': 'application/json'  // Ensure the content type is set to JSON
        },
        body: JSON.stringify({
          messageContent: messageContent,
          maxTokens: 300,  // Sending the necessary parameters in the body
        })
      });

      // Ensure that the response is in JSON format
      const data = await response.json();
      let parsedContent = data.body.split('"text":"')[1]; // Extract the part after "text"
      parsedContent = parsedContent.split('"}')[0]; // Take everything before the final closing "

      // Step 2: Replace escaped characters
      parsedContent = parsedContent.replace(/\\"/g, '"'); // Replace \" with "
      parsedContent = parsedContent.replace(/\\n/g, ''); // Remove any newline characters

      // Helper function to extract a value from the parsedContent
      function extractValue(content, key) {
        const regex = new RegExp(key + "\\s*:\\s*([^,]*)"); // Match the key followed by ": value"
        const match = content.match(regex);
        return match ? match[1].trim() : null;
      }

      // Extract specific values
      const estimatedTripTime = extractValue(parsedContent, "Estimated trip time");
      const departureTime = extractValue(parsedContent, "Departure time");
      const arrivalTime = extractValue(parsedContent, "Arrival time");
      const carbonFootprint = extractValue(parsedContent, "Carbon footprint \\(kg\\)");

      // Manually extract the route array (since it's more complex)
      const routeRegex = /route\s*:\s*\[([^\]]*)\]/;
      const routeMatch = parsedContent.match(routeRegex);
      let route = [];
      if (routeMatch) {
        const routeContent = routeMatch[1].trim();
        const routeEntries = routeContent.split("},").map(e => e.trim() + '}'); // Split individual route objects
        route = routeEntries.map(entry => {
          const busLine = extractValue(entry, "bus line").replace(/"/g, '');
          const startStation = extractValue(entry, "start station").replace(/"/g, '');
          const endStation = extractValue(entry, "end station").replace(/"/g, '');
          return {
            "bus line": busLine,
            "start station": startStation,
            "end station": endStation
          };
        });
      }

      // Extract the geojson line
      const geojsonRegex = /geojson line\s*:\s*\{([^}]*)\}/;
      const geojsonMatch = parsedContent.match(geojsonRegex);
      let geojsonLine = {};
      if (geojsonMatch) {
        const coordinatesRegex = /"coordinates"\s*:\s*\[([^\]]*)\]/;
        const coordinatesMatch = geojsonMatch[1].match(coordinatesRegex);
        const coordinates = coordinatesMatch
          ? coordinatesMatch[1].split("],").map(pair => pair.replace(/\[|\]/g, '').split(',').map(Number))
          : [];
        
        geojsonLine = {
          "type": "FeatureCollection",
          "features": [
            {
              "type": "Feature",
              "geometry": {
                "type": "LineString",
                "coordinates": coordinates
              }
            }
          ]
        };
      }

      // Step 3: Build the result object using extracted values
      const result = {
        "Estimated trip time": Number(estimatedTripTime),
        "Departure time": departureTime.replace(/"/g, ''),
        "Arrival time": arrivalTime.replace(/"/g, ''),
        "Carbon footprint (kg)": parseFloat(carbonFootprint),
        "route": route,
        "geojson line": geojsonLine
      };

      // const cleanedText = data.body.replace(/\\n/g, '').replace(/\\"/g, '"');
      // const escapedText = JSON.parse(cleanedText);

      // // // Extract the content inside "text" and unescape it
      // // let escapedText = parsed.content[0].text;

      // // Remove the escaped backslashes (\\) from the string
      // escapedText = escapedText.replace(/\\"/g, '"');

      // // Parse the inner JSON
      // const formattedContent = JSON.parse(escapedText);

      // Respond to the client with the data received from Lambda
      res.json(result);

    } catch (error) {
      console.error("Error invoking Lambda:", error.response ? error.response.data : error.message);
      throw error;
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
});


// app.get('/transitrout/*', function(req, res) {
//   // Add your code here
//   res.json({success: 'get call succeed!', url: req.url});
// });


app.listen(3000, function() {
    console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
