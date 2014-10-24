var dwPoster = function () {
    var publicMethods = {};

    publicMethods.scrapePage = function scrapePage() {
        chrome.runtime.sendMessage({operation: "get-poster-data"}, function (response) {

            console.log("Sending Page Contents..");
            if (!response.tracking) {
                console.log("Datawake - tracking disabled. Not posting data.");
                return;
            }
            var data = JSON.stringify({
                cookie: document.cookie,
                html: $('body').html(),
                url: response.url,
                userName: response.userName,
                domain: response.domain,
                trail: response.trail
            });
            chrome.runtime.sendMessage({operation: "post-page-contents", contents: data}, function (response) {
                if (response.success) {
                    var contents = response.contents;
                    chrome.runtime.sendMessage({operation: "last-id", id: contents.id, count: contents.count}, null);
                }
            });
        });
    };


    return publicMethods;

}();

// delay the post to get slow loading content
window.setTimeout(function () {
    dwPoster.scrapePage();
}, 1000);

var messageListenerMethods = {
    "highlighttext": highlightText,
    "selections": highlightSelections
};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (messageListenerMethods.hasOwnProperty(request.operation)) {
        var callMethod = messageListenerMethods[request.operation];
        callMethod(request, sender, sendResponse);
    }
});

function highlightText(request, sender, sendResponse) {
    var entities_in_domain = request.entities_in_domain;

    if (entities_in_domain.length > 0) {
        $.ajax({
            type: "GET",
            url: request.serviceUrl + "/external_links/get",
            contentType: 'application/json',
            dataType: 'json',
            success: function (links) {
                $.each(entities_in_domain, function (index, entity) {
                    var i = index;
                    $('body').highlight(entity.name, 'datawake-highlight-' + i);

                    if (links.length > 0) {
                        var content = '<div> <h4>' + key + ":" + entity.type + '</h4>';
                        $.each(links, function (index, linkObj) {
                            var link = linkObj.link;
                            link = link.replace("$ATTR", encodeURI(entity.type));
                            link = link.replace("$VALUE", encodeURI(entity.name));
                            content = content + '<a href="' + link + '" target="_blank">' + linkObj.display + '</a><br>';
                        });
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
                                    '<h4>' + entity.type + ":" + entity.name + '</h4>' +
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

                });
                sendResponse({result: "ok"});
            },
            error: function (jqxhr, textStatus, reason) {
                console.log("external link error " + textStatus + " " + reason);
                sendResponse({result: "error"});
            }
        })
    }
}

function highlightSelections(request, sender, sendResponse) {
    var selections = request.selections;
    $.each(selections, function (index, selection) {
        $('body').highlight(selection);
    });
    sendResponse({result: "ok"});
}
