import { Controller } from "@hotwired/stimulus"
import { Loader } from "@googlemaps/js-api-loader"
import html2canvas from "html2canvas"
import $ from "jquery"

export default class extends Controller {
  static targets = ["map"]
  static values = { url: String, key: String};
  connect() {
    var controller = this
    const loader = new Loader({
      apiKey: this.keyValue,
      version: "quarterly",
      libraries: ["maps", "geocoding", "marker", "elevation"]
    })
    const mapOptions = {
      center: { lat: 43.7219135, lng: 10.5235271 },
      zoom: 19,
      styles: [
      { "featureType": "landscape.man_made",
        "elementType": "geometry.fill",
        "stylers": [{ "color": "#ffff0000"},{ "visibility": "on"}]
      },
      { "featureType": "landscape.man_made",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#000000"},{"visibility": "off"}]
      }]
    }
    loader
      .importLibrary('maps')
      .then(({ Map }) => {
          var map;
          map = new Map(this.mapTarget, mapOptions);
          this.polygons = new PolygonCluster(map);
          google.maps.event.addListenerOnce(map, 'tilesloaded', this.compute_polygon.bind(this,map));
          google.maps.event.addListener(map, 'zoom_changed', this.compute_polygon.bind(this,map));
          google.maps.event.addListener(map, 'dragend', this.compute_polygon.bind(this,map));
      })
  }
  compute_polygon(map) {
    var controller = this
    console.log($('#google_map').innerWidth())
    console.log($('#google_map').innerHeight())
    html2canvas(document.querySelector("#google_map"), {
      useCORS: true,
      width: $('#google_map').innerWidth(),
      height: $('#google_map').innerHeight(),
      scale: 1
    }).then(function(canvas) {
      controller.query(canvas,map,controller.polygons);
    });
  }
  query(canvas,map,polygons)
  { var dataURL = canvas.toDataURL("image/png");
    $.ajax({
        url: this.urlValue,
        type: 'post',
        data: {
          token: $('meta[name="api-token"]').attr('content'),
          png_base64_image: dataURL,
        },
        dataType: 'json',
        error: function(response) {
          $('.response').text(JSON.stringify(response.responseText,null,'\t'));
        }
    }).done(function( msg ) {
        $('.response').text(JSON.stringify($.extend({benchmarks: msg.benchmarks},{groups: msg.groups}),null,'\t'));
        polygons.reset_polygons()
        polygons.read_polygons(msg.polygons);
    });
  }
}

function point2LatLng(x,y, map) {
  var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
  var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
  var scale = Math.pow(2, map.getZoom());
  var worldPoint = new google.maps.Point(x / scale + bottomLeft.x, y / scale + topRight.y);
  return map.getProjection().fromPointToLatLng(worldPoint);
}

class Polygon {
  constructor(google_poly) {
    this.gpoly = google_poly;
    google_poly.cpolygon = this;
    this.bounds = new google.maps.LatLngBounds();
    this.selected = false;
    var that = this;
    this.gpoly.getPath().forEach(function(element,index){ that.bounds.extend(element); });
  }
  toggle_selected() {
    return(this.selected = !this.selected);
  }
  contains_location(latLng) {
    return google.maps.geometry.poly.containsLocation(latLng, this.gpoly);
  }
  overlaps_with(polygon) {
    var overlaps = false;
    var that = this;
    this.gpoly.getPath().forEach(function(element,index){
      if(polygon.contains_location(element))
      { overlaps = true;
      }
    });
    return(overlaps);
  }
}

class PolygonCluster {
  constructor(google_map) {
    this.map = google_map;
    this.map_offset_x = ($('#google_map').outerWidth() - $('#google_map').innerWidth()) / 2;
    this.map_offset_y = ($('#google_map').outerHeight() - $('#google_map').innerHeight()) / 2;
    this.polygons = [];
  };
  add_polygon(poly) {
    var that = this;
    this.polygons.push(poly);
    poly.gpoly.setMap(this.map);
    google.maps.event.addListener(poly.gpoly,"mouseover",function(){
      this.setOptions({strokeOpacity: 1});
    });
    google.maps.event.addListener(poly.gpoly,"mouseout",function(){
      this.setOptions({strokeOpacity: 0});
    });
  }
  reset_polygons() {
    $.each(this.polygons,function(index,polygon){
      polygon.gpoly.setMap(null);
    });
    this.polygons = []
  }
  read_polygons(polygons) {
    var that = this;
    $.each(polygons,function(index,polygon){
      var outerCoords = [];
      var all = [];
      //outer
      $.each(polygon.outer,function(index,point){
        outerCoords.push(point2LatLng(point.x - that.map_offset_x,point.y - that.map_offset_y,that.map));
      });
      all.push(outerCoords);
      //inner
      $.each(polygon.inner,function(index,sequence){
        var c = [];
        $.each(sequence,function(index,point){
          c.push(point2LatLng(point.x - that.map_offset_x,point.y - that.map_offset_y,that.map));
        });
        all.push(c);
      });
      var google_poly = new google.maps.Polygon({
          paths: all,
          strokeColor: '#00FF00',
          strokeOpacity: 0,
          strokeWeight: 3,
          fillColor: '#0000FF',
          fillOpacity: 0
        });
      var cluster_poly = new Polygon(google_poly);
      that.add_polygon(cluster_poly);
    });
  };
}
