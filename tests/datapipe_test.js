var io = require('socket.io-client');
var uuid = require('node-uuid');

// Nevada City -- 39.2616° N, 121.0161° W
var location = [
    { id: uuid.v4(), lat: 39.2616, lon: -121.0161 }
];
var status = [
    { markerseq: 0 }
];

var client = io.connect('http://localhost:3100/points');
client.on('connect', function() {
    console.log("Emitting 'client': " + JSON.stringify(location[0]));
    client.emit('client', JSON.stringify(location[0]));

    console.log("Setting timer to emit status.");    
    setTimeout(function() {
        console.log("Emitting 'status': " + JSON.stringify(status[0]));
        client.emit('status', JSON.stringify(status[0]));
    }, 1000);
});
client.on('point', function(point) {
    console.log("Got point: " + point);
});

    
function wait () {
   setTimeout(wait, 1000);
}
wait();    
