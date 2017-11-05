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
            .await(function (err, US) {
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
            })


})();
