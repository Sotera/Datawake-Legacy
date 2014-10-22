var addon = self;

function scrapePage() {
    try {
        var data = {
            cookie: document.cookie,
            html: encodeURI($('body').html())
        };
        console.debug("Emitting page contents....");
        addon.port.emit("contents", data);
    }
    catch (e) {
        console.error("Unable to Scrape Page: " + e);
    }
}

addon.port.on("loadToolTips", function (urls) {
    try {
        var $ = document; // shortcut
        for (var index in urls) {
            var cssId = 'myCss' + index;  // you could encode the css path itself to generate id..
            if (!$.getElementById(cssId)) {
                var head = $.getElementsByTagName('head')[0];
                var link = $.createElement('link');
                link.id = cssId;
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = urls[index];
                link.media = 'all';
                head.appendChild(link);
            }
        }
    }
    catch (e) {
        console.error("Do not have access to the document.");
    }
});


addon.port.on("highlight", function (selectionObject) {
    for (var index in selectionObject.selections) {
        $('body').highlight(selectionObject.selections[index]);
    }
});

addon.port.on("highlightWithToolTips", function (helperObject) {
    console.debug("Highlight with tool tips..");
    var i = 0;
    var entities = helperObject.entities;
    var links = helperObject.links;
    for (var index in entities) {
        var typeObj = entities[index];
        var value = typeObj.name;
        var key = typeObj.type;
        $('body').highlight(value, 'datawake-highlight-' + i);
        if (links.length > 0) {
            var content = '<div> <h4>' + key + ":" + value + '</h4>';
            for (var j in links) {
                var linkObj = links[j];
                var link = linkObj.link;
                link = link.replace("$ATTR", encodeURI(key));
                link = link.replace("$VALUE", encodeURI(value));
                content = content + '<a href="' + link + '" target="_blank">' + linkObj.display + '</a><br>'
            }
            content = content + '</div>';
            $('.datawake-highlight-' + i).tooltipster({
                content: $(content),
                animation: 'fade',
                interactive: true,
                delapy: 200,
                theme: 'tooltipster-noir',
                trigger: 'hover'
            });


        }
        else {
            $('.datawake-highlight-' + i).tooltipster({
                content: $('<div>' +
                        '<h4>' + key + ":" + value + '</h4>' +
                        'no external tools available' +
                        '</div>'
                ),
                animation: 'fade',
                interactive: true,
                delapy: 200,
                theme: 'tooltipster-noir',
                trigger: 'hover'
            });
        }
        i = i + 1
    }
});
$(document).ready(function () {
    addon.port.emit("getToolTips");
    $(window).on('hashchange', scrapePage);
    scrapePage();
});
