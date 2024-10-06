const express = require('express');
const fetch = require('node-fetch'); // Assuming fetch is imported via node-fetch
const { LocationClient, CalculateRouteCommand } = require("@aws-sdk/client-location");
const axios = require('axios');
const app = express();

app.get('/carRoute', async function (req, res) {
  try {
    const start = req.query.startpoint.split(',').map(Number); // Split and convert to numbers [longitude, latitude]
    const end = req.query.endpoint.split(',').map(Number); // Split and convert to numbers [longitude, latitude]
    const time = req.query.time;
    const userAgent = req.headers['user-agent'];

    // Call the getBestRoute function to get the route details
    const routeDetails = await getBestRoute(start, end, new Date(time));

    // Prepare route data for Lambda invocation
    const invokedStuff = invokeLambda(routeDetails);

    const messageContent = `Given this car route:\n${JSON.stringify(formattedRoutes, null, 2)}, please provide the carbon emission for it. Give the total carbon footprint in a JSON file in the format 'Carbon Footprint: _'`;

    // Invoke Lambda via the API with the formatted message
    const url = "https://vk9hc6kko2.execute-api.us-west-2.amazonaws.com/prod/invoke-model";

    let response = null;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageContent: messageContent,
          maxTokens: 300
        })
      });

      const data = await response.json();
      console.log("Lambda response:", data);

      const cleanedText = data.body.replace(/\\n/g, '').replace(/\\"/g, '"');
      const escapedText = JSON.parse(cleanedText);

      // Remove escaped backslashes and parse inner JSON
      const formattedContent = JSON.parse(escapedText.replace(/\\"/g, '"'));

      // Respond with the data from Lambda
      res.json(formattedContent);

    } catch (error) {
      console.error("Error invoking Lambda:", error.response ? error.response.data : error.message);
      throw error;
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
});

// Add the functions from the original file

async function getBestRoute(start, end, departureTime) {
  const client = new LocationClient({
    region: "us-west-2",
    credentials: {
      accessKeyId: "ASIA2CAURXRRXCOSAF37",
      secretAccessKey: "b9u/icVbv6DMXNwheHgp/Wgb4Bcb5ZJdO6nEbrqk"
    }
  });

  const travelMode = "Car";

  const commandInput = {
    CalculatorName: "explore.route-calculator.Esri",
    DeparturePosition: start,
    DestinationPosition: end,
    TravelMode: travelMode,
    DepartureTime: departureTime
  };

  const command = new CalculateRouteCommand(commandInput);

  try {
    const response = await client.send(command);
    return response;
  } catch (error) {
    console.error("Error getting route:", error);
    throw new Error("Failed to get route");
  }
}

const invokeLambda = async (routes) => {
  const url = "https://vk9hc6kko2.execute-api.us-west-2.amazonaws.com/prod/invoke-model";

    const formattedRoutes = routes.map((route, index) => {
    return `Route ${index + 1}: Start at ${route.StartPosition} to End at ${route.EndPosition}, covering a distance of ${route.Distance} km, and taking ${route.DurationSeconds / 60} minutes.`;
    }).join('\n');
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
    } catch (error) {
      throw error;
    }

};

const extractCarbonFootprint = (lambdaResponse) => {
  try {
      // Parse the body as JSON since it's returned as a string
      const body = JSON.parse(lambdaResponse.body);

      // Extract the content field, which contains the response from the AI model
      const content = body.content.find((item) => item.type === 'text');

      // Extract the carbon footprint value from the content (assumes value is within the text block)
      const carbonFootprintMatch = content.text.match(/"Carbon Footprint\\\": (\d+\.\d+)/);

      // Check if the match was successful
      if (carbonFootprintMatch && carbonFootprintMatch[1]) {
          const carbonFootprint = parseFloat(carbonFootprintMatch[1]);

          // Return the carbon footprint in the desired JSON format
          return {
              "Carbon Footprint": carbonFootprint
          };
      } else {
          throw new Error("Carbon Footprint value not found in the response");
      }
  } catch (error) {
      console.error("Error extracting Carbon Footprint:", error);
      throw error;
  }
};

module.exports = {
  invokeLambda,
  extractCarbonFootprint
};