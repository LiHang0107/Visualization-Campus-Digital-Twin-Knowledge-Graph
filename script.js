// 初始化地图
var map = L.map('map').setView([30.617, -96.336], 15);

// 添加OpenStreetMap底图
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 图层组
var buildingLayer = L.layerGroup().addTo(map);
var parkingLotLayer = L.layerGroup().addTo(map);
// 将 highlightedLayer 改为 L.featureGroup()
var highlightedLayer = L.featureGroup().addTo(map);

// 解析WKT为GeoJSON
function parseWKT(wkt) {
    var wicket = new Wkt.Wkt();
    wicket.read(wkt);
    return wicket.toJson();
}

// 加载建筑
function loadBuildings() {
    $.getJSON('/api/buildings', function(data) {
        buildingLayer.clearLayers();
        data.buildings.forEach(function(building) {
            if (building.geometry) {
                var geom = parseWKT(building.geometry);
                var layer = L.geoJSON(geom, {
                    onEachFeature: function(feature, layer) {
                        layer.bindPopup('<b>' + building.name + '</b><br>' +
                                        'Address: ' + building.address + '<br>' +
                                        'Year Built: ' + building.yearBuilt + '<br>' +
                                        'Floors: ' + building.numFloors);
                    },
                    style: { color: 'blue' }
                });
                layer.addTo(buildingLayer);
            }
        });
    });
}

// 加载停车场
function loadParkingLots() {
    $.getJSON('/api/parking_lots', function(data) {
        parkingLotLayer.clearLayers();
        data.parking_lots.forEach(function(parkingLot) {
            if (parkingLot.geometry) {
                var geom = parseWKT(parkingLot.geometry);
                var layer = L.geoJSON(geom, {
                    onEachFeature: function(feature, layer) {
                        layer.bindPopup('<b>' + parkingLot.name + '</b><br>' +
                                        'Type: ' + parkingLot.lotType + '<br>' +
                                        'Area: ' + parkingLot.area + '<br>' +
                                        'Length: ' + parkingLot.length);
                    },
                    style: { color: 'green' }
                });
                layer.addTo(parkingLotLayer);
            }
        });
    });
}

// 查找附近的停车场
function findNearbyParking(buildingName) {
    $.getJSON('/api/nearby_parking', { building_name: buildingName }, function(data) {
        if (data.error) {
            alert(data.error);
            return;
        }
        // 清除之前的高亮和列表
        highlightedLayer.clearLayers();
        $('#parking-list').empty();

        // 收集occupancy数据
        var occupancyData = [];

        data.nearby_parking.forEach(function(parkingLot) {
            if (parkingLot.geometry) {
                var geom = parseWKT(parkingLot.geometry);

                // 解析占用率为数值
                var occupancyValue = parseFloat(parkingLot.occupancy) || 0;

                // 计算透明度：占用率越高，透明度越低
                var opacity = 1 - (occupancyValue / 100);
                opacity = Math.max(0.2, Math.min(opacity, 1));

                var layer = L.geoJSON(geom, {
                    onEachFeature: function(feature, layer) {
                        layer.bindPopup('<b>' + parkingLot.name + '</b><br>' +
                                        'Type: ' + parkingLot.lotType + '<br>' +
                                        'Area: ' + parkingLot.area + '<br>' +
                                        'Length: ' + parkingLot.length + '<br>' +
                                        'Occupancy: ' + parkingLot.occupancy);
                    },
                    style: {
                        color: 'red',
                        fillOpacity: opacity,
                        opacity: opacity
                    }
                });
                layer.addTo(highlightedLayer);

                // 添加到列表
                var listItem = $('<li>' + parkingLot.name + '</li>');
                listItem.click(function() {
                    map.fitBounds(layer.getBounds());
                    layer.openPopup();
                });
                $('#parking-list').append(listItem);

                // 收集occupancy数据
                occupancyData.push({
                    name: parkingLot.name,
                    occupancy: occupancyValue
                });
            }
        });

        // 缩放到高亮的停车场
        if (highlightedLayer.getLayers().length > 0) {
            map.fitBounds(highlightedLayer.getBounds());
        } else {
            alert('No nearby parking lots found.');
        }

        // 绘制占用率柱状图
        drawOccupancyChart(occupancyData);
    });
}

// 绘制占用率柱状图
function drawOccupancyChart(data) {
    var ctx = document.getElementById('occupancy-chart').getContext('2d');

    // 销毁旧的图表实例（如果存在）
    if (window.occupancyChart) {
        window.occupancyChart.destroy();
    }

    var labels = data.map(function(item) { return item.name; });
    var occupancies = data.map(function(item) { return item.occupancy; });

    // 如果没有数据，不绘制图表
    if (labels.length === 0) {
        return;
    }

    window.occupancyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Occupancy (%)',
                data: occupancies,
                backgroundColor: 'rgba(54, 162, 235, 0.7)'
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// 事件监听
$('#search-btn').click(function() {
    var buildingName = $('#building-input').val().trim();
    if (buildingName) {
        findNearbyParking(buildingName.toLowerCase());
    }
});

// 初始加载
loadBuildings();
loadParkingLots();

