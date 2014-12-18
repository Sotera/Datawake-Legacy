var addon = self;

function scrapePage() {
    try {
        var pageContents = {
            html: $('body').html()
        };
        console.debug("Emitting page contents....");
        addon.port.emit("contents", pageContents);
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

addon.port.on("removeSelections", function(className){
    $("body").removeHighlight(className);
});


addon.port.on("highlight", function (selectionObject) {
    $.each(selectionObject.selections, function(index, item){
        $('body').highlight(item, "selections");
    });
});

addon.port.on("highlightTrailEntities", function(trailEntities){
    $.each(trailEntities, function(index, entity){
        $("body").highlight(entity, "trailentities");
    });
});

addon.port.on("promptForFeedback", function(obj){
    var extractedValue = prompt("What should have been extracted?", obj.raw_text);
    var type = prompt("What type of entity is this? (phone, email, etc)");
    var response = {};
    response.type = type;
    response.value = extractedValue;
    addon.port.emit("feedback", response);
});

addon.port.on("highlightWithToolTips", function (helperObject) {
    console.debug("Highlight with tool tips..");
    var entities = helperObject.entities;
    var externalLinks = helperObject.links;
    $.each(entities, function (index, typeObj) {
        var value = typeObj.name;
        var key = typeObj.type;
        var i = index;
        $('body').highlight(value, 'datawake-highlight-' + i);
        if (externalLinks.length > 0) {
            var content = '<div> <h4>' + key + ":" + value + '</h4>';
            for (var j in externalLinks) {
                var linkObj = externalLinks[j];
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
    })
});
$(document).ready(function () {
    addon.port.emit("getToolTips");
    $(window).on('hashchange', scrapePage);
    scrapePage();
});
