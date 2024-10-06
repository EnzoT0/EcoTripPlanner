import React, { useRef, useEffect, FC, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapLibreGlDirections from '@maplibre/maplibre-gl-directions';
import './map.css';

interface TripDetails {
    estimatedTripTime: number;
    departureTime: string;
    arrivalTime: string;
    carbonFootprint: number;
}

const Map: FC = () => {
    const [vehicleType, setVehicleType] = useState<string>('car'); // State to hold the selected vehicle type
    const [startLocation, setStartLocation] = useState<string>(''); // State for start location
    const [startTime, setStartTime] = useState<string>(''); // State for start time
    const [endLocation, setEndLocation] = useState<string>(''); // State for end location
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<maplibregl.Map | null>(null);


    const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
    const lng: number = -123.1207;
    const lat: number = 49.2827;
    const zoom: number = 14;
    const API_KEY: string = 'VqOq8qTPIUbXEni1yY0L';


    useEffect(() => {
        if (map.current || !mapContainer.current) return; // stops map from initializing more than once

        map.current = new maplibregl.Map({
            container: mapContainer.current as HTMLElement,
            style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${API_KEY}`,
            center: [lng, lat],
            zoom: zoom
        });

        // Add the 3D buildings layer after the map style loads
        map.current.on('load', () => {
            // Add a 3D buildings layer using 'fill-extrusion'
            map.current!.addLayer({
                id: '3d-buildingsF',
                source: 'openmaptiles', // OpenMapTiles source name from the MapTiler style
                'source-layer': 'building',
                type: 'fill-extrusion',
                minzoom: 15,
                paint: {
                    'fill-extrusion-color': '#aaa',
                    'fill-extrusion-height': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        16.05,
                        ['get', 'height']
                    ],
                    'fill-extrusion-base': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        16.05,
                        ['get', 'min_height']
                    ],
                    'fill-extrusion-opacity': 0.6
                }
            });

        });

        map.current.on('load', () => {
            const directions = new MapLibreGlDirections(map.current!);
            directions.interactive = true;

            // set waypoint
            // directions.setWaypoints([
            //     [-73.8271025, 40.8032906],
            //     [-73.8671258, 40.82234996],
            //   ]);

            // // Remove waypoints
            // directions.removeWaypoint(0);

            // // Add waypoints
            // directions.addWaypoint([-73.8671258, 40.82234996], 0);



            directions.clear();
        })

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.current.on('click', (event) => {
            const { lngLat } = event; // clicked coordinates

            let marker: maplibregl.Marker = new maplibregl.Marker({ color: "#ff00ff" })
                .setLngLat([lngLat.lng, lngLat.lat])
                .addTo(map.current!);

            const popup = new maplibregl.Popup({ offset: 25 });

            // Attach the popup to the marker
            marker.setPopup(popup);

            // Optional: If you want the popup to be shown by default
            // marker.togglePopup();

            const markerElement = marker.getElement();
            markerElement.style.cursor = 'pointer'; // Change cursor to pointer when hovering over the marker

            marker.getElement().addEventListener('click', (e) => {
                e.stopPropagation();
                marker.remove();
            });

            marker.getElement().addEventListener('mouseenter', () => {
                const hoveredLngLat = marker.getLngLat();
                popup.setLngLat(hoveredLngLat)
                    .setHTML(`<h3>Coordinates</h3><p>Longitude: ${hoveredLngLat.lng}, Latitude: ${hoveredLngLat.lat}</p>`)
                    .addTo(map.current!);
            });

            // Hide popup on mouseleave
            marker.getElement().addEventListener('mouseleave', () => {
                popup.remove();
            });
        });

    }, [API_KEY, lng, lat, zoom]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault(); // Prevent the default form submission
        
        const formData = {
            vehicleType,
            startLocation,
            startTime,
            endLocation
        };

        try {
            const response = await fetch('API END', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                throw new Error("HTTP ERROR");
            }

            const result = await response.json();
            const coordinates = result["geojson line"];

            for (let i = 0; i < coordinates.length; i++) {
                const coord = coordinates[i];
                let marker: maplibregl.Marker = new maplibregl.Marker({ color: "#ff00ff" }).setLngLat(coord).addTo(map.current!);
                marker.getElement().addEventListener('click', (e) => {
                    e.stopPropagation();
                    marker.remove();
                });
            }

            setTripDetails({
                estimatedTripTime: result["Estimated trip time"],
                departureTime: result["Departure time"],
                arrivalTime: result["Arrival time"],
                carbonFootprint: result["Carbon footprint (kg)"],
            });

    } catch (error) {
        console.error('Error submitting form:', error);
        // Handle errors here (e.g., show error message to user)
    }

        // console.log(`Selected Vehicle Type: ${vehicleType}`);
        // console.log(`Start Location: ${startLocation}`);
        // console.log(`Start Time: ${startTime}`);
        // console.log(`End Location: ${endLocation}`);
        // Here you can send the data to your backend or perform other actions
    };

    return (
        <>
            <div className="form-container">
                <form onSubmit={handleSubmit}>
                    <label htmlFor="vehicleType">Select Vehicle Type:</label>
                    <select
                        id="vehicleType"
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)} // Update state on change
                    >
                        <option value="car">Car</option>
                        <option value="bus">Bus</option>
                        <option value="truck">Truck</option>
                        <option value="foot">Foot</option>
                    </select>

                    <label htmlFor="startLocation">Start Location:</label>
                    <input
                        type="text"
                        id="startLocation"
                        value={startLocation}
                        onChange={(e) => setStartLocation(e.target.value)} // Update state on change
                        placeholder="Enter start location"
                    />

                    <label htmlFor="startTime">Start Time:</label>
                    <input
                        type="time"
                        id="startTime"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)} // Update state on change
                    />

                    <label htmlFor="endLocation">End Location:</label>
                    <input
                        type="text"
                        id="endLocation"
                        value={endLocation}
                        onChange={(e) => setEndLocation(e.target.value)} // Update state on change
                        placeholder="Enter end location"
                    />

            {tripDetails && (
                <div className="trip-details">
                    <h2>Trip Details</h2>
                    <p>Estimated trip time: {tripDetails.estimatedTripTime} minutes</p>
                    <p>Departure time: {tripDetails.departureTime}</p>
                    <p>Arrival time: {tripDetails.arrivalTime}</p>
                    <p>Carbon footprint: {tripDetails.carbonFootprint} kg CO2</p>
                </div>
                )}

                    <button type="submit">Submit</button>
                </form>
            </div>
            <div className="map-wrap">
                <div ref={mapContainer} className="map" />
            </div>
        </>
    );
}

export default Map;