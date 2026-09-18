'use client'

import { useMemo } from 'react'
import { MapContainer, Marker, TileLayer, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const location: [number, number] = [36.2057, 44.0092]
const logoUrl = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/smahsed%20burger%20logo-W4ZpDGxyYKZ6LEZpmhyyqEEmnj3xrp.jpg'

export function LocationMap() {
  const icon = useMemo(() => L.divIcon({
    className: 'brand-map-marker',
    html: `<span class="brand-map-marker__ring"><img src="${logoUrl}" alt="Smash'd Burger" /></span>`,
    iconSize: [62, 74],
    iconAnchor: [31, 68],
    popupAnchor: [0, -64],
  }), [])

  return (
    <MapContainer center={location} zoom={16} scrollWheelZoom className="location-map" aria-label="Interactive map showing Smash'd Burger in Erbil">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={location} icon={icon}>
        <Popup>
          <strong>Smash&apos;d Burger</strong><br />The Boulevard, Gulan Street
        </Popup>
      </Marker>
    </MapContainer>
  )
}
