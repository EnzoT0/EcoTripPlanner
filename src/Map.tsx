import React, { useRef, useEffect, FC, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';


const Map: FC = () => {
    
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

    return (
            <div className="map-wrap">
                <div ref={mapContainer} className="map" />
            </div>
    );
}

export default Map;