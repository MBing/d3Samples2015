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

            var ufoCount = _.values(clustered)
                            .reduce(function (sum, group) {
                                return sum + group.length;
                            }, 0);

            centroids = (centroids.map(function (pos, i) {
                return {
                    x: pos[0],
                    y: pos[1],
                    maxR: R(ratios[i]),
                    allHere: clustered[i].length,
                    absAll: ufoCount,
                    population: clusterPopulations[i],
                    count: 0
                };
            }))
            svg.append('g')
                .attr('class', 'centroids')
                .datum(
                    {
                        type: 'centroids'
                    }
                )
                .selectAll('circle')
                .data(centroids)
                .enter()
                .append('circle')
                .attr({
                    cx: function (d) {
                        return d.x;
                    },
                    cy: function (d) {
                        return d.y;
                    },
                    // r: function (d, i) {
                    //     return R(ratios[i]);
                    // },
                    r: 0,
                    class: 'centroid',
                    id: function (d, i) {
                        return 'centroid';
                    }
                })
        },

        placeUfos: function (ufos) {
            if (!ufos) return;

            var format = d3.time.format("%m/%d/%Y %H:%M");
            
            ufos = _.sortBy(ufos, 
                    function (ufo) { 
                        return format.parse(ufo.time); 
                    });

            var positions = ufos.map(function (ufo) {
                return geoProjection([Number(ufo.lon), Number(ufo.lat)]);
            });

            var fps = 60,
                perFrame = Math.ceil(positions.length > fps
                                        ? positions.length / fps
                                        : 1);

            d3.timer((function (counter) {
                var previous = (new Date()).getTime();
                return function draw () {
                    var now = new Date().getTime(),
                        delta = now - previous,
                        frames = Math.ceil(delta / (1000 / fps));

                    var toDraw = {
                        pos: positions.splice(0, perFrame * frames),
                        ufos: ufos.splice(0, perFrame * frames)
                    };

                    var g = svg.append('g')
                                .attr('class', 'points')
                                .datum(
                                    {
                                        type: 'points'
                                    }
                                )
                        drawn = g.selectAll('circle')
                            .data(toDraw.pos)
                            .enter()
                            .append('circle')
                            .attr({
                                cx: function (d) {
                                    return d[0];
                                },
                                cy: function (d) {
                                    return d[1];
                                },
                                r: 2,
                                class: 'point'
                            }),
                        centroids = d3.selectAll(toDraw.ufos.map(
                            function (ufo) {
                                return '#centroid-' + ufo.cluster;
                            }
                        ).join(', '));

                    g.transition()
                        .duration(800)
                        .style("opacity", .3);

                    centroids.each(function (d) {
                        d.count += drawn.size();
                        d3.select(this).datum(d);
                    });

                    var ratios = [],
                        currentlyDrawn = 0;
                    
                    svg.selectAll('.centroid')
                        .each(function (d) {
                            currentlyDrawn += d.count;
                        })
                        .each(function (d) {
                            if (d.population > 0) {
                                ratios.push((d.count / d.population) / currentlyDrawn);
                            } else {
                                ratios.push(0);
                            }
                        });

                    var R = d3.scale.linear()
                        .domain([0, d3.max(ratios)])
                        .range([0, 20]);

                    svg.selectAll('.centroid')
                        .transition()
                        .duration(500)
                        .attr('r', function (d) {
                            if (d.population < 1) {
                                return 0;
                            }
                            return R((d.count / d.population) / currentlyDrawn);
                        })
                        .ease(d3.ease('elastic-in'));

                    svg.selectAll('g.centroids, g.points')
                        .sort(function (a, b) {
                            if (a.type == 'centroids') return 1;
                            return -1;
                        });

                    counter += drawn.size;
                    previous = now;

                    return counter >= drawn.size();
                };
            })(0));
        }
    };
};
