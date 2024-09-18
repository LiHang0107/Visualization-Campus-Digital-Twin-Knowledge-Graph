from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from rdflib import Graph, Namespace
from rdflib.namespace import RDF, RDFS
from shapely import wkt
from shapely.ops import transform
import pyproj

app = Flask(__name__)
CORS(app)  # 启用跨域请求

# 加载本体
g = Graph()
g.parse('./rdf_data/tamu_ont.owl')

# 定义命名空间
GEO = Namespace('http://www.opengis.net/ont/geosparql#')
TAMU_ONTO = Namespace('http://tamu.edu/ontologies/tamu_ont#')
SOSA = Namespace('http://www.w3.org/ns/sosa/')

# 定义坐标转换：EPSG:3857 -> EPSG:4326
project_to_wgs84 = pyproj.Transformer.from_crs('epsg:3857', 'epsg:4326', always_xy=True).transform

# 工具函数
def extract_property(subject, property):
    obj = g.value(subject, property)
    return str(obj) if obj else None

def convert_geometry(wkt_str):
    try:
        geom = wkt.loads(wkt_str)  # 将WKT转换为Shapely几何对象
        geom_transformed = transform(project_to_wgs84, geom)  # 坐标转换
        return geom_transformed.wkt  # 返回转换后的WKT字符串
    except Exception as e:
        print(f"Error converting geometry: {e}")
        return None

def get_occupancy(parking_instance):
    # 找到相关的Observation并获取occupancy值
    for observation in g.subjects(SOSA.hasFeatureOfInterest, parking_instance):
        occupancy_value = extract_property(observation, SOSA.hasSimpleResult)
        if occupancy_value:
            # 将occupancy_value转换为浮点数
            try:
                # 去除百分号并转换为浮点数
                occupancy_value = float(str(occupancy_value).replace('%', '').strip())
            except ValueError:
                occupancy_value = None
            return occupancy_value
    return None

# API路由
@app.route('/api/buildings', methods=['GET'])
def get_buildings():
    buildings = []
    for s in g.subjects(RDF.type, TAMU_ONTO.Building):
        geometry_wkt = extract_property(s, GEO.hasGeometry)
        geometry_converted = convert_geometry(geometry_wkt) if geometry_wkt else None

        building_data = {
            'id': str(s),
            'name': extract_property(s, RDFS.label),
            'address': extract_property(s, TAMU_ONTO.hasAddress),
            'yearBuilt': extract_property(s, TAMU_ONTO.yearBuilt),
            'numFloors': extract_property(s, TAMU_ONTO.numFloors),
            'geometry': geometry_converted
        }
        buildings.append(building_data)
    return jsonify({'buildings': buildings})

@app.route('/api/parking_lots', methods=['GET'])
def get_parking_lots():
    parking_lots = []
    for s in g.subjects(RDF.type, TAMU_ONTO.ParkingLot):
        geometry_wkt = extract_property(s, GEO.hasGeometry)
        geometry_converted = convert_geometry(geometry_wkt) if geometry_wkt else None

        parking_lot_data = {
            'id': str(s),
            'name': extract_property(s, RDFS.label),
            'lotType': extract_property(s, TAMU_ONTO.lotType),
            'area': extract_property(s, TAMU_ONTO.area),
            'length': extract_property(s, TAMU_ONTO.length),
            'geometry': geometry_converted
        }
        parking_lots.append(parking_lot_data)
    return jsonify({'parking_lots': parking_lots})

@app.route('/api/nearby_parking', methods=['GET'])
def get_nearby_parking():
    building_name = request.args.get('building_name', '').strip().lower()
    building_uri = None

    # 查找建筑
    for s, label_literal in g.subject_objects(RDFS.label):
        label = str(label_literal).strip().lower()
        if label == building_name and (s, RDF.type, TAMU_ONTO.Building) in g:
            building_uri = s
            break

    if not building_uri:
        return jsonify({'error': 'Building not found'}), 404

    # 查找附近的停车场
    nearby_parking = []
    for o in g.objects(building_uri, TAMU_ONTO.nearby):
        if (o, RDF.type, TAMU_ONTO.ParkingLot) in g:
            geometry_wkt = extract_property(o, GEO.hasGeometry)
            geometry_converted = convert_geometry(geometry_wkt) if geometry_wkt else None

            occupancy_value = get_occupancy(o)
            # 确保 occupancy_value 是浮点数或设为 0
            occupancy_value = occupancy_value if occupancy_value is not None else 0

            parking_lot_data = {
                'id': str(o),
                'name': extract_property(o, RDFS.label),
                'lotType': extract_property(o, TAMU_ONTO.lotType),
                'area': extract_property(o, TAMU_ONTO.area),
                'length': extract_property(o, TAMU_ONTO.length),
                'geometry': geometry_converted,
                'occupancy': occupancy_value
            }
            nearby_parking.append(parking_lot_data)

    return jsonify({'nearby_parking': nearby_parking})

# 前端页面路由
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('.', path)

# 运行应用
if __name__ == '__main__':
    app.run(debug=True)
