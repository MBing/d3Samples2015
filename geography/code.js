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
                    .projection(projection),
            stateIdMap = d3.map({

            });

        queue()
            .defer(d3.json, './data/us.json')
            .defer(d3.json, "data/states-hash.json")
            .defer(d3.csv, "data/state-populations.csv")
            .defer(d3.json, "data/city-populations.json")
            .defer(d3.xml, "data/military-bases.kml")
            .defer(d3.csv, "data/full-data-geodata.csv")
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
                                .enter()
                                .append('g');

                states.append('path')
                    .attr('d', path);
                
                svg.append("path")
                    .datum(topojson.mesh(US, US.objects.states, 
                                         function(a, b) { return a !== b; }))
                    .attr("class", "borders")
                    .attr("d", path);

                var positions = _ufos
                        .map(function (d) {
                            return projection([d.lon, d.lat]);
                        })
                        .filter(function (d) {
                            return !!d;
                        });
                
                svg.append('g')
                        .selectAll('circle')
                        .data(positions)
                        .enter()
                        .append('circle')
                        .attr({
                            cx: function (d) {
                                return d[0];
                            },
                            cy: function (d) {
                                return d[1];
                            },
                            r: 1,
                            class: 'point'
                        })
            })


})();
