import axios from 'axios';

// Define the type for the Lambda response
interface LambdaResponse {
  data: any;
  status: number;
  statusText: string;
}

let startPosition: string;
let endPosition: string;
let timeNow: string;

startPosition = "ubc";
endPosition = "metrotown";
timeNow = "2pm";

let messageContent2: string;
messageContent2 = "please find a public transit route from " + startPosition + " to " + endPosition + " at " + timeNow + ". Please find the fastest one.Please give the answer in the following format, do not include any other text::\n{\n    Estimated trip time: number, // total travel time in minutes\n    Departure time: HH:MM, // time of departure\n    Arrival time: HH:MM, // estimated time of arrival\n    Carbon footprint (kg): number, // carbon emission in kilograms\n    route: [\n        {\n            bus line: string, // bus line number or name\n            start station: string, // name of start station\n            end station: string // name of end station\n        },\n        as many as necessary\n    ],\n    geojson line: {} // GeoJSON object representing the route path\n}";


// Define the function with appropriate types
export const invokeLambda = async (messageContent: string, maxTokens: number): Promise<LambdaResponse> => {
  const url = "https://vk9hc6kko2.execute-api.us-west-2.amazonaws.com/prod/invoke-model";

  try {
    const response = await axios.post<LambdaResponse>(url, {
      messageContent: messageContent,
      maxTokens: maxTokens,
    });

    console.log("Lambda response:", response.data);
    return response;
  } catch (error) {
    console.error("Error invoking Lambda:", error);
    throw error; // Rethrow the error so the caller can handle it
  }
};


export const parseTextToJson = (text: string): unknown => {
  // Replace escaped characters like \n and \" to make it a valid JSON string
  const cleanedText = text.replace(/\\n/g, '').replace(/\\"/g, '"');
  
  // Parse the cleaned string into a JSON object
  const jsonObject = JSON.parse(cleanedText);
  
  return jsonObject;
}
