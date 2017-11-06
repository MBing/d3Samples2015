(function () {
        var width = 960,
            height = 600;
    
        var svg = d3.select("#graph")
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height),
            projection = d3.geo
                    .albersUsa()
                    .scale(1280)
                    .translate([width / 2, height / 2]),
            path = d3.geo
                    .path()
                    .projection(projection);

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

                var ufoCounts = _.mapValues(ufos, function (ufos, state) {
                    return ufos.length / populations.get(states.get(state))[2010];
                });

                var quantize = d3.scale.quantize()
                        .domain(d3.extent(_.values(ufoCounts)))
                        .range(d3.range(9).map(function (i) {
                            return 'q' + i + '-9-green';
                        }));

                var states = svg.append('g')
                                .attr('class', 'states')
                                .selectAll('g')
                                .data(topojson.feature(US, US.objects.states).features)
                                .enter();

                states.append('path')
                    .attr('d', path)
                    .attr('class', function(d) { 
                        return quantize(ufoCounts[stateIdMap.get(d.id)]); 
                    });
                
                svg.append('path')
                    .datum(topojson
                        .mesh(US, US.objects.states, 
                            function(a, b) {
                                return a !== b;
                            }
                        )
                    )
                    .attr('class', 'borders')
                    .attr('d', path);

                /* Replace the data in the circle svg 'clusters.centroids' with 'positions' and you will see all
                * the exact positions, since we find clustered positions more useful, we use clusters
                * to visualise our data.
                */

                // var positions = _ufos
                //         .map(function (d) {
                //             return projection([d.lon, d.lat]);
                //         })
                //         .filter(function (d) {
                //             return !!d;
                //         });

                var tmp = clusteredUfos(_ufos, projection),
                    clustered = tmp[0],
                    clusters = tmp[1],
                    clusterPopulations = prepare.clusterPopulations(clustered, cityPopulations);

                var ratios = _.mapValues(clustered,
                                    function (group, key) {
                                        var population = clusterPopulations[key];

                                        if (population === 0) {
                                            return 0;
                                        }

                                        return group.length / population;
                                    }),
                    R = d3.scale.linear()
                                .domain([0, d3.max(_.values(ratios))])
                                .range([2, 20]),
                    basePositions = prepare.basePositions(militaryBases, projection);
                    
                svg.append('g')
                    .selectAll('path')
                    .data(basePositions)
                    .enter()
                    .append('path')
                    .attr('d', d3.svg.symbol().type('cross').size(32))
                    .attr('class', 'base')
                    .attr('transform', function (d) {
                        return 'translate(' + d[0] + ',' + d[1] + ')';
                    });

                svg.append('g')
                        .selectAll('circle')
                        .data(clusters.centroids)
                        .enter()
                        .append('circle')
                        .attr({
                            cx: function (d) {
                                return d[0];
                            },
                            cy: function (d) {
                                return d[1];
                            },
                            r: function (d, i) {
                                return R(ratios[i]);
                            },
                            class: 'point'
                        })
            })


})();
