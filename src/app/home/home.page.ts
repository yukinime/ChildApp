import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import * as L from 'leaflet';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, AfterViewInit {
  map: L.Map | undefined;
  markerParent: L.Marker | undefined;
  markerChild: L.Marker | undefined;
  address: string = 'Loading address...';
  otherAddress: string = 'Loading parent address...'; // Update this line
  apiKey = '29e467d9bb574e6da61953fbd39b5c67';  // API Key OpenCage

  constructor(private http: HttpClient) {}

  ngOnInit() {
    console.log('Loading map...');
  }

  ngAfterViewInit() {
    this.loadMap();
    window.addEventListener('resize', () => {
      if (this.map) {
        console.log('Resizing map...');
        setTimeout(() => {
          this.map!.invalidateSize();
        }, 100);
      }
    });

    // Tambahkan sedikit delay untuk memastikan ukuran peta sudah benar saat pertama kali dimuat
    setTimeout(() => {
      if (this.map) {
        console.log('Initial map resize...');
        this.map.invalidateSize();
      }
    }, 500); // Adjust this timeout as necessary

    this.updateLocation();
    setInterval(() => this.updateLocation(), 10000); // Update location every 10 seconds
  }

  loadMap() {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Map container not found!');
      return;
    } else {
      console.log('Map container found:', mapContainer);
    }

    const DefaultIcon = L.icon({
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
    });

    L.Marker.prototype.options.icon = DefaultIcon;

    this.map = L.map('map').setView([0, 0], 13);
    console.log('Map object created.');

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    console.log('Tile layer added to the map.');

    if (this.map) {
      console.log('Invalidating map size...');
      this.map.invalidateSize();
    }
  }

  async updateLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      console.log('Latitude:', lat, 'Longitude:', lon);

      if (this.markerChild && this.map) {
        this.markerChild.setLatLng([lat, lon]);
      } else if (this.map) {
        this.markerChild = L.marker([lat, lon], {icon: this.getChildIcon()}).addTo(this.map);
      }

      if (this.map) {
        this.map.setView([lat, lon], 13);
        console.log('Map view set to new location:', lat, lon);
      }

      const address = await this.getAddress(lat, lon);
      this.address = address || 'Unable to retrieve address';
      console.log('Address:', this.address);

      const body = {
        role: 'child',
        latitude: lat,
        longitude: lon,
        address: this.address
      };

      console.log('Data to be sent to server:', body);

      const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

      this.http.post('https://4e20255e-8188-46b5-9505-53ccdf128cdf-00-26wxol8esggii.picard.replit.dev/', body, { headers }).subscribe(
        response => {
          console.log('Location updated on server:', response);
          this.getParentLocation(); // Get parent location after updating child location
        },
        error => console.error('Error updating location on server:', error)
      );
    } catch (error) {
      console.error('Error in updateLocation:', error);
    }
  }

  async getParentLocation() {
    this.http.get('https://4e20255e-8188-46b5-9505-53ccdf128cdf-00-26wxol8esggii.picard.replit.dev/?role=parent').subscribe(
      (response: any) => {
        const parentLocation = response.parent;
        console.log('Parent location from server:', parentLocation); // Log the parent location data
        if (parentLocation && this.map) {
          const lat = parentLocation.latitude;
          const lon = parentLocation.longitude;
          const address = parentLocation.address;
          if (this.markerParent) {
            this.markerParent.setLatLng([lat, lon]);
          } else {
            this.markerParent = L.marker([lat, lon], {icon: this.getParentIcon()}).addTo(this.map);
          }
          this.otherAddress = address || 'Unknown Address'; // Update address text with parent location
          console.log('Parent location updated on map:', lat, lon, 'Address:', this.otherAddress);
        }
      },
      error => console.error('Error getting parent location from server:', error)
    );
  }

  async getAddress(lat: number, lon: number): Promise<string> {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${this.apiKey}`;
    try {
      const response: any = await this.http.get(url).toPromise();
      console.log('Geocoding response:', response);
      const results = response.results;
      if (results.length > 0) {
        console.log('Formatted address:', results[0].formatted);
        return results[0].formatted;
      } else {
        console.warn('No results found for the given coordinates');
        return 'Address not found';
      }
    } catch (error) {
      console.error('Error getting address:', error);
      return 'Error retrieving address';
    }
  }

  getParentIcon() {
    return L.icon({
      iconUrl: 'assets/parent-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
    });
  }

  getChildIcon() {
    return L.icon({
      iconUrl: 'assets/child-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
    });
  }
}
