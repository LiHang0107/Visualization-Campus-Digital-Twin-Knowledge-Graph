# graphic interface for Campus Digital Twin Knowledge Graph

This web application allows users to find parking lots and their pressure near a specific building on the Texas A&M University campus. 

## Features

- **Interactive Map**: Uses Leaflet to display a map of the campus with building and parking lot markers.
- **Building Search**: Search for a building by name to find nearby parking lots.
- **Parking Lot Information**: Display detailed information about features.
- **Occupancy Chart**: Visualize occupancy rates of parking lots in a bar chart.
- **Dynamic Layer Updates**: Load buildings and parking lots data and update the map dynamically.

## Functions

1. Visit `http://127.0.0.1:5000` in a web browser after running the project.
2. Enter a building name in the search input and click the "Search" button.
3. The map will display the building's location and highlight nearby parking lots.
4. The sidebar will list the nearby parking lots, and clicking on a parking lot name will zoom the map to its location.
5. An occupancy chart shows the current occupancy rates of the nearby parking lots.

[![Project Vis](./Graphic interface.png)](https://youtu.be/sQKgBkpvUxw)

## How It Works

1. The project will decode the knowledge graph file and visualize it on OSM.
2. Building and parking lot data are loaded through AJAX requests to server-side API endpoints (`/api/buildings` and `/api/parking_lots`).
3. When a user searches for a building, an AJAX request is sent to `/api/nearby_parking` to retrieve nearby parking lots. The map then highlights these lots, and the sidebar updates to show the list of nearby parking lots.
4. The occupancy rates are visualized in a bar chart using Chart.js, providing a clear overview of parking lot usage.

## Getting Started

### Requirements

Ensure you have Python 3 installed. To install the necessary packages, run:

```
pip install -r requirements.txt
```
### Running the Project

To execute the entire workflow, run the `app.py` script:

```
python app.py
```
### Visiting the URL

please visit in your browser

```
http://127.0.0.1:5000
```

## Future Enhancements

- Add real-time data integration for parking lot occupancy rates.
- Implement user location tracking to suggest the nearest parking lots automatically.
- Expand the search functionality to include filtering by parking lot type or capacity.
