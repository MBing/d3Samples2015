(function () {
        var width = 960,
            height = 600;
    
        var svg = d3.select("#graph")
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height),
            geoProjection = d3.geo
                    .albersUsa()
                    .scale(1280)
                    .translate([width / 2, height / 2]),
            geoPath = d3.geo
                    .path()
                    .projection(geoProjection);

        queue()
            .defer(d3.json, 'data/us.json')
            .defer(d3.json, 'data/states-hash.json')
            .defer(d3.csv, 'data/state-populations.csv')
            .defer(d3.json, 'data/city-populations.json')
            .defer(d3.xml, 'data/military-bases.kml')
            .defer(d3.csv, 'data/full-data-geodata.csv')
            .await(function (err, US, statesHash, populations, cityPopulations, militaryBases, _ufos) {
                _ufos = prepare.filterUfos(_ufos);
                var ufos = prepare.ufos(_ufos);
                populations = prepare.populations(populations);
                states = prepare.states(statesHash);

                var tmp = clusteredUfos(_ufos, geoProjection),
                    clustered = tmp[0],
                    clusters = tmp[1],
                    clusterPopulations = prepare.clusterPopulations(clustered, cityPopulations);

                var drawers = Drawers(svg, ufos, populations, geoPath, geoProjection);
                drawers.map(US, geoPath, states);
                drawers.bases(militaryBases, geoProjection);
                drawers.centroids(clusters.centroids, clustered, clusterPopulations);
            })


})();
