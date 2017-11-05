(function () {
    var slugify = function(str) {
        return str.toLowerCase()
                .replace(/ /g, '-')
                .replace(/[^\w-]+/g, '-');
    };

    var timeTaken = function (since) {
        return (((new Date()) - since) / 1000) + 's';
    }

    var parseIndex = function (fragment) {
        return Array.prototype.map.call(
            fragment.querySelectorAll('tbody tr'),
            function (row) {
                var a = row.querySelector('a');

                return {
                    state: a.textContent,
                    count: Number(row.querySelectorAll('td')[1].textContent),
                    link: 'data' + slugify(a.textContent) + '.html'
                };
            }
        );
    };

    var fetchState = function (state, callback) {
        callback = callback || function () {};

        console.log('fetching', state.state);

        d3.html(state.link, function (fragment) {
            console.log(fragment);
            var timeFormatter = d3.time.format('%m/%d/%y %H:%M'),
                postedFormatter = d3.time.format('%m/%d/%y'),
                thisYear = (new Date()).getFullYear();

            state.data = Array.prototype.map.call(
                fragment.querySelectorAll('tbody tr'),
                function (row) {
                    var cells = row.querySelectorAll('td'),
                        parsed = {};

                    ['time', 'city', 'state', 'shape', 'duration', 'summary', 'posted'].forEach(
                        function (key, i) {
                            parsed[key] = cells[i].textContent;
                        }
                    );

                    parsed.time = timeFormatter.parse(parsed.time);
                    parsed.posted = postedFormatter.parse(parsed.posted);

                    return parsed;
                }
            )
            .filter(function (datum) {
                return !!datum.time && !!datum.posted;
            })
            .map(function (datum) {
                //fix y2k trouble
                if (datum.time.getFullYear() > thisYear) {
                    datum.time.setFullYear(datum.time.getFullYear() - 100);
                }
                if (datum.posted.getFullYear() > thisYear) {
                    datum.posted.setFullYear(datum.posted.getFullYear() - 100);
                }

                return datum;
            });

            callback(null, state);
        });
    };

    d3.html('state-index.html', function (fragment) {
        var index = parseIndex(fragment),
            start = new Date();

        async.map(index, fetchState, function (err, data) {
            var timeFormatter = d3.time.format('%x %H:%M'),
                postedFormatter = d3.time.format('%x');

            start = new Date();
            data = data.map(function (datum) {
                return datum.data.map(function (datum) {
                    datum.time = timeFormatter(datum.time);
                    datum.posted = postedFormatter(datum.posted);

                    return datum;
                });
            })
            .reduce(function (a, b) {
                return a.concat(b);
            });

            var csv = d3.csv.format(data);

            var blob = new Blob([csv], {
                type: 'text/plain;charset=utf-8'
            });

            saveAs(blob, 'full-data.csv');
        });
    });
})();
