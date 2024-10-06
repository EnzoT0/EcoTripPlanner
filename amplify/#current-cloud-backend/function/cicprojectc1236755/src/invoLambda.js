const axios = require("axios")

// Define the type for the Lambda response
// interface LambdaResponse {
//   data: any;
//   status: number;
//   statusText: string;
// }

// Define the function with appropriate types

// export const invokeLambda = async (start: string, end: string, time: string): Promise<LambdaResponse> => {
//   const url = "https://vk9hc6kko2.execute-api.us-west-2.amazonaws.com/prod/invoke-model";

//   const messageContent = `please find a public transit route from ${start} to ${end} at ${time}. Please find the fastest one.
//   Please give the answer in the following format, do not include any other text::
//   {
//     Estimated trip time: number, // total travel time in minutes
//     Departure time: HH:MM, // time of departure
//     Arrival time: HH:MM, // estimated time of arrival
//     Carbon footprint (kg): number, // carbon emission in kilograms
//     route: [
//         {
//             bus line: string, // bus line number or name
//             start station: string, // name of start station
//             end station: string // name of end station
//         },
//         as many as necessary
//     ],
//     geojson line: {} // GeoJSON object representing the route path
//   }`;

//   try {
//     const response = await axios.post<LambdaResponse>(url, {
//       messageContent: messageContent,
//       maxTokens: 300,
//     });

//     console.log("Lambda response:", response.data);
//     return response.data; // Return the response data, not the full response object
//   } catch (error) {
//     console.error("Error invoking Lambda:", error);
//     throw error; // Rethrow the error so the caller can handle it
//   }
// };

export const invokeLambda = async (start, end, time) => {
  const url = "https://vk9hc6kko2.execute-api.us-west-2.amazonaws.com/prod/invoke-model";
  
  try {
    const response = await axios.post(url, {
      messageContent: `Please find a public transit route from ${start} to ${end} at ${time}.`,
      maxTokens: 300,
    }, {
      headers: {
        'Content-Type': 'application/json' // Ensure content type is set correctly
      }
    });

    console.log("Lambda response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error invoking Lambda:", error.response ? error.response.data : error.message);
    throw error;
  }
};




export const parseTextToJson = (text) => {
  // Replace escaped characters like \n and \" to make it a valid JSON string
  const cleanedText = text.replace(/\\n/g, '').replace(/\\"/g, '"');
  
  // Parse the cleaned string into a JSON object
  const jsonObject = JSON.parse(cleanedText);
  
  return jsonObject;
}
