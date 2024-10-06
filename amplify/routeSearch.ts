import { LocationClient, CalculateRouteCommand, CalculateRouteCommandInput } from "@aws-sdk/client-location";
import axios from 'axios';


type Coordinates = [number, number]; // [longitude, latitude]

async function getBestRoute(start: Coordinates, end: Coordinates, departureTime?: Date, arrivalTime?: Date): Promise<any> {
    const client = new LocationClient({
        region: "us-west-2",
        credentials: {
            accessKeyId: "ASIA2CAURXRRXCOSAF37",  
            secretAccessKey: "b9u/icVbv6DMXNwheHgp/Wgb4Bcb5ZJdO6nEbrqk"
        }
    });

    const travelMode: CalculateRouteCommandInput['TravelMode'] = "Car"; // car, truck, walking LOL

    const commandInput: CalculateRouteCommandInput = {
        CalculatorName: "explore.route-calculator.Esri",
        DeparturePosition: start,
        DestinationPosition: end,
        TravelMode: travelMode,
        ...(departureTime ? { DepartureTime: departureTime } : {}),
        ...(arrivalTime ? { ArrivalTime: arrivalTime } : {}),
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

// const startLocation: Coordinates = [-123.1207, 49.2827]; // Vancouver, BC (Longitude, Latitude)
// const endLocation: Coordinates = [-123.1162, 49.2463]; // University of British Columbia (Longitude, Latitude)

// getBestRoute(startLocation, endLocation)
//     .then(route => console.log("Route details:", route))
//     .catch(error => console.error("Error:", error));


export const invokeLambda = async (routes: any[]) => {
    const url = "https://vk9hc6kko2.execute-api.us-west-2.amazonaws.com/prod/invoke-model";

    try {
        // Constructing the route information to include in the message
        const formattedRoutes = routes.map((route, index) => {
            return `Route ${index + 1}: Start at ${route.StartPosition} to End at ${route.EndPosition}, covering a distance of ${route.Distance} km, and taking ${route.DurationSeconds / 60} minutes.`;
        }).join('\n');

        const response = await axios.post(url, {
            messageContent: `Given this car route:\n${formattedRoutes}, please provide the carbon emission for it. Give the total carbon footprint in a json file in the format 'Carbon Footprint: _' in the end.`,
            maxTokens: 300,
        }, {
            headers: {
                'Content-Type': 'application/json' // Ensure content type is set correctly
            }
        });

        console.log("Lambda response:", response.data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const extractCarbonFootprint = (lambdaResponse: any) => {
    try {
        // Parse the body as JSON since it's returned as a string
        const body = JSON.parse(lambdaResponse.body);

        // Extract the content field, which contains the response from the AI model
        const content = body.content.find((item: any) => item.type === 'text');

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

export const convertToGeoJSON = (routeResponse: any, carbonFootprint: number, departureTime: Date, arrivalTime: Date) => {
    // Extract relevant data from the route response
    const legs = routeResponse.Legs || [];
    
    // Calculate trip time (in minutes)
    const tripDurationSeconds = legs.reduce((total: number, leg: any) => total + leg.DurationSeconds, 0);
    const tripTimeMinutes = Math.round(tripDurationSeconds / 60);

    // Extract the coordinates for the route (using step start positions for simplicity)
    const coordinates = legs.flatMap((leg: any) => leg.Steps.map((step: any) => step.StartPosition));

    // Start and end positions
    const start_position = legs[0]?.StartPosition;
    const end_position = legs[legs.length - 1]?.EndPosition;

    // Create the GeoJSON structure
    const geoJSON = {
        "content": {
            "Trip Time": tripTimeMinutes,  // Trip duration in minutes
            "Departure time": departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),  // Format as HH:mm
            "Arrival time": arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),  // Format as HH:mm
            "Carbon footprint (kg)": carbonFootprint,  // Carbon footprint in kilograms
            "route": [
                {
                    "start": start_position,
                    "end": end_position
                }
            ],
            "geojson line": {
                "type": "MultiLineString",
                "coordinates": [
                    coordinates  // The array of coordinates representing the route
                ]
            }
        }
    };

    return geoJSON;
};
// interface GeoJSONLineString {
//     type: "Feature";
//     geometry: {
//         type: "LineString";
//         coordinates: [number, number][]; // Array of [longitude, latitude] coordinates
//     };
//     properties: {
//         [key: string]: any; // Additional properties can be added if necessary
//     };
// }

// function convertRouteToGeoJSON(routeData: any): GeoJSONLineString {
//     const coordinates: [number, number][] = [];

//     if (routeData?.Legs) {
//         for (const leg of routeData.Legs) {
//             if (leg?.Geometry?.LineString) {
//                 coordinates.push(...leg.Geometry.LineString);
//             }
//         }
//     }

//     const geoJSON: GeoJSONLineString = {
//         type: "Feature",
//         geometry: {
//             type: "LineString",
//             coordinates: coordinates
//         },
//         properties: {
//             distance: routeData?.Summary?.Distance || 0,
//             duration: routeData?.Summary?.DurationSeconds || 0,
//             dataSource: routeData?.Summary?.DataSource || "unknown"
//         }
//     };

//     return geoJSON;
// }
