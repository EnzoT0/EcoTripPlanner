import React, { useRef, useEffect, FC, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';


const Map: FC = () => {
    const [vehicleType, setVehicleType] = useState<string>('car'); // State to hold the selected vehicle type
    const [startLocation, setStartLocation] = useState<string>(''); // State for start location
    const [startTime, setStartTime] = useState<string>(''); // State for start time
    const [endLocation, setEndLocation] = useState<string>(''); // State for end location
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<maplibregl.Map | null>(null);
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
        

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.current.on('click', (event) => {
            const {lngLat} = event; // clicked coordinates

            let marker : maplibregl.Marker = new maplibregl.Marker({color: "#ff00ff"})
            .setLngLat([lngLat.lng, lngLat.lat])
            .addTo(map.current!);

            const markerElement = marker.getElement();
            markerElement.style.cursor = 'pointer'; // Change cursor to pointer when hovering over the marker

            marker.getElement().addEventListener('click', (e) => {
                e.stopPropagation();
                marker.remove();
        });
    });
    
    }, [API_KEY, lng, lat, zoom]);

    const handleSubmit = (event: React.FormEvent) => {
      event.preventDefault(); // Prevent the default form submission
      console.log(`Selected Vehicle Type: ${vehicleType}`);
      console.log(`Start Location: ${startLocation}`);
      console.log(`Start Time: ${startTime}`);
      console.log(`End Location: ${endLocation}`);
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
                      <option value="truck">Foot</option>
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