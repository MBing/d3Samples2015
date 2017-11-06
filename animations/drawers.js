var Drawers = function (svg, ufos, populations, geoPath, geoProjection) {
    return {
        map: function (US, geoPath, states) {
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
                            .append('path')
                            .attr('d', geoPath)
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
                .attr('d', geoPath);

        },

        bases: function (militaryBases, geoProjection) {
            var basePositions = prepare.basePositions(militaryBases, geoProjection);
            
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
        },

        centroids : function (centroids, clustered, clusterPopulations) {
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
                            .range([2, 20]);

            svg.append('g')
                .selectAll('circle')
                .data(centroids)
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
        }
    };
};
