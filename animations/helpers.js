var stateIdMap = d3.map({
    1: "AL",
    2: "AK",
    4: "AZ",
    5: "AR",
    6: "CA",
    8: "CO",
    9: "CT",
    10: "DE",
    11: "DC",
    12: "FL",
    13: "GA",
    15: "HI",
    16: "ID",
    17: "IL",
    18: "IN",
    19: "IA",
    20: "KS",
    21: "KY",
    22: "LA",
    23: "ME",
    24: "MD",
    25: "MA",
    26: "MI",
    27: "MN",
    28: "MS",
    29: "MO",
    30: "MT",
    31: "NE",
    32: "NV",
    33: "NH",
    34: "NJ",
    35: "NM",
    36: "NY",
    37: "NC",
    38: "ND",
    39: "OH",
    40: "OK",
    41: "OR",
    42: "PA",
    44: "RI",
    45: "SC",
    46: "SD",
    47: "TN",
    48: "TX",
    49: "UT",
    50: "VT",
    51: "VA",
    53: "WA",
    54: "WV",
    55: "WI",
    56: "WY"
}),
    knownStates = _.sortBy(stateIdMap.values());

    var prepare = {
        filterUfos: function (ufos) {
            return ufos
                .filter(function (ufo) {
                    return !!ufo.state;
                })
                .filter(function (ufo) {
                    return _.indexOf(knownStates, ufo.state, true) >= 0;
                });
        },

        ufos: function (ufos) {
            return _.groupBy(ufos,
                function (ufo) {
                    return ufo.state;
                }
            )
        },

        ufosBySeason: function (ufos, clusterAssignments) {
            var format = d3.time.format('%m/%d/%Y %H:%M'),
                seasons = d3.scale.ordinal()
                    .domain(d3.range(12))
                    .range(["winter", "winter", 
                            "spring", "spring", "spring", 
                            "summer", "summer", "summer", 
                            "autumn", "autumn", "autumn", 
                            "winter"]);
    
            ufos = ufos.map(function (ufo, i) {
                ufo.cluster = clusterAssignments[i];
                return ufo;
            });
    
            return _.groupBy(ufos,
                             function (ufo) {
                                 var d = format.parse(ufo.time),
                                     year = d.getMonth() === 11 ? d.getFullYear()+1 : d.getFullYear();
                                 
                                 return year + '-' + seasons(d.getMonth());
                             });
        },

        states: function (states) {
            return d3.map(_.mapValues(states,
                function (s) {
                    return s.toLowerCase();
                }
            ));
        },

        populations: function (populations) {
            return d3.map(_.zipObject(
                populations.map(function (p) {
                    return p.State.toLowerCase();
                }),
                populations.map(function (p) {
                    var years = [2010, 2011, 2012, 2013];
                    return _.zipObject(years,
                        years.map(function (y) {
                            return Number(p[y].replace(/\./g, ''));
                        })
                    );
                })
            ));
        },

        clusterPopulations: function (clustered, cityPopulations) {
            return _.mapValues(clustered, function (cluster) {
                var populations = cluster.map(function (d) {
                    return {city: d.label.toLowerCase(),
                            population: cityPopulations[d.label.toLowerCase()] || 0};
                });

                return _.uniq(populations, function (d) {
                    return d.city; 
                })
                .reduce(function (sum, d) {
                    return sum+Number(d.population);
                }, 0);
            })
        },

        basePositions: function (militaryBases, projection) {
            return _.map(
                militaryBases.getElementsByTagName('Placemark'), function (d) {
                    var point = _.find(d.children,
                                    function (node) {
                                        return node.nodeName === 'Point';
                                    }).textContent.split(',');
                    var icon = _.find(d.children,
                                    function (node) {
                                        return node.nodeName === 'Style';
                                    });
                    if (icon.innerHTML.indexOf('force-icons.png') < 1
                                    && icon.innerHTML.indexOf('navy-icons.png') < 1) {
                                        return null;
                                    }

                                    return projection([Number(point[0]), Number(point[1])]);
                }
            )
            .filter(function (d) {
                return !!d;
            });
        }
    };

    var clusteredUfos = function (ufos, projection) {
        var labels = [],
            vectors = [];

        ufos
            .map(function (d) { 
                return {
                    label: [d.city, d.state].join(', '),
                    vector: projection([d.lon, d.lat])};
            })
            .filter(function (d) {
                return !!d.vector;
            })
            .forEach(function (d) {
                labels.push(d.label);
                vectors.push(d.vector);
            });
        var clusters = figue.kmeans(120, vectors);
        var clustered = _.groupBy(clusters.assignments.map(function (cluster, i) {
            return {
                label: labels[i],
                cluster: cluster
            };
        }), 'cluster');
        
            return [clustered, clusters];
    };
