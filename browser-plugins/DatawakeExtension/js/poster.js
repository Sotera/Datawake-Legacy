function scrapePage() {

    console.log("Sending Page Contents..");
    var data = {
        html: $('body').html()
    };
    chrome.runtime.sendMessage({operation: "post-page-contents", contents: data}, function (response) {
        if (response.success) {
            var contents = response.contents;
            chrome.runtime.sendMessage({operation: "last-id", id: contents.id, count: contents.count}, null);
        }
    });

}


// delay the post to get slow loading content
window.setTimeout(function () {
    scrapePage();
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
        chrome.runtime.sendMessage({operation: "get-external-links"}, function (data) {
            var links = data.links;
            $.each(entities_in_domain, function (index, e) {
                var i = index;
                var entity = {};
                entity.name = e.name.trim();
                entity.type = e.type.trim();
                $('body').highlight(entity.name, 'datawake-highlight-' + i);
                var content = '<div> <h4>' + entity.type + ":" + entity.name + '</h4>';
                if (links.length > 0) {
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
                        content: $(content + 'no external tools available' + '</div>'),
                        animation: 'fade',
                        interactive: true,
                        delapy: 200,
                        theme: 'tooltipster-noir',
                        trigger: 'hover'
                    });
                }

            });
            sendResponse({success: true});
        });
    } else {
        sendResponse({success: false});
    }
}

function highlightSelections(request, sender, sendResponse) {
    try {
        var selections = request.selections;
        $.each(selections, function (index, selection) {
            $('body').highlight(selection);
        });
        sendResponse({success: true});
    } catch (e) {
        sendResponse({success: false, error: e.message})
    }

}
