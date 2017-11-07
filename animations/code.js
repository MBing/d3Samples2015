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

                var ufosBySeason = prepare.ufosBySeason(_ufos, clusters.assignments),
                    seasons = d3.scale.ordinal()
                        .domain(d3.range(4))
                        .range(['winter', 'spring', 'summer', 'autumn']);
                
                var stepper = setInterval((function () {
                    var step = 0,
                        year = 1945;
                    
                    return function () {
                        year = timelineStep (step++, year);
                    };
                })(),1000);

                function timelineStep (step, year) {
                    var season = seasons(step % 12);

                    d3.select('h1.season')
                        .html([season, year].join(' '));

                    requestAnimationFrame(function () {
                        drawers.placeUfos(ufosBySeason[
                            [year, season].join('-')
                        ]);
                    });

                    if (step % 4 === 3) {
                        year += 1;
                    }

                    if (year > 2014) {
                        clearInterval(stepper);
                    }

                    return year;
                }
            });


})();
